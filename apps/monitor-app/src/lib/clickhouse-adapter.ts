import { createAdapterFactory, type CustomAdapter, type DBAdapterDebugLogOption } from 'better-auth/adapters';
import { sql } from '@/app/server/lib/clickhouse/client';
import { isEmpty, mapValues, omit, first } from 'remeda';
import { z } from 'zod';

type ClickHouseAdapterConfig = {
  debugLogs?: DBAdapterDebugLogOption;
  usePlural?: boolean;
};

type WhereOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in';

type WhereCondition = {
  field: string;
  value?: unknown;
  operator: WhereOperator;
  connector: 'AND' | 'OR';
};

type SqlFragment = ReturnType<typeof sql<Record<string, unknown>>>;
type FieldNameGetter = (opts: { model: string; field: string }) => string;

const formatDateValue = (value: unknown): unknown => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }
  return value;
};

const formatDataForInsert = (data: Record<string, unknown>): Record<string, unknown> =>
  mapValues(data, formatDateValue);

const joinSql = (fragments: SqlFragment[], separator: SqlFragment): SqlFragment => {
  if (fragments.length === 0) throw new Error('Cannot join empty fragments');
  const [firstFragment, ...rest] = fragments;
  for (const fragment of rest) {
    firstFragment.append(separator);
    firstFragment.append(fragment);
  }
  return firstFragment;
};

const selectFrom = (model: string): SqlFragment => sql`SELECT * FROM ${sql.identifier(model)} FINAL`;

const countFrom = (model: string): SqlFragment => sql`SELECT count() as count FROM ${sql.identifier(model)} FINAL`;

const withWhere = (query: SqlFragment, whereClause: SqlFragment): SqlFragment => {
  query.append(sql` WHERE `);
  query.append(whereClause);
  return query;
};

const withLimit = (query: SqlFragment, limit: number): SqlFragment => {
  query.append(sql` LIMIT ${sql.param(limit, 'UInt32')}`);
  return query;
};

const withOffset = (query: SqlFragment, offset: number): SqlFragment => {
  query.append(sql` OFFSET ${sql.param(offset, 'UInt32')}`);
  return query;
};

const withOrderBy = (query: SqlFragment, field: string, direction: 'asc' | 'desc' = 'asc'): SqlFragment => {
  query.append(sql` ORDER BY ${sql.identifier(field)}`);
  query.append(direction === 'desc' ? sql` DESC` : sql` ASC`);
  return query;
};

const withMutationSync = (query: SqlFragment): SqlFragment => {
  query.append(sql` SETTINGS mutations_sync=1`);
  return query;
};

const buildColumnValuePairs = (
  data: Record<string, unknown>,
  model: string,
  fieldNameGetter: FieldNameGetter
): { columns: SqlFragment; values: SqlFragment } => {
  const entries = Object.entries(formatDataForInsert(data));
  if (isEmpty(entries)) throw new Error('No fields to insert');

  const columns = joinSql(
    entries.map(([key]) => sql`${sql.identifier(fieldNameGetter({ model, field: key }))}`),
    sql`, `
  );
  const values = joinSql(
    entries.map(([, value]) => sql`${sql.param(value, 'String')}`),
    sql`, `
  );

  return { columns, values };
};

const buildUpdateQuery = (model: string, setClause: SqlFragment, whereClause: SqlFragment): SqlFragment => {
  const query = sql`ALTER TABLE ${sql.identifier(model)} UPDATE `;
  query.append(setClause);
  query.append(sql` WHERE `);
  query.append(whereClause);
  return withMutationSync(query);
};

const buildDeleteQuery = (model: string, whereClause: SqlFragment): SqlFragment => {
  const query = sql`ALTER TABLE ${sql.identifier(model)} DELETE WHERE `;
  query.append(whereClause);
  return withMutationSync(query);
};

const countResultSchema = z.array(z.object({ count: z.coerce.number() }));
const updateDataSchema = z.record(z.string(), z.unknown());

const executeCount = async (model: string, whereClause: SqlFragment): Promise<number> => {
  const query = withWhere(countFrom(model), whereClause);
  const rows = countResultSchema.parse(await query);
  return first(rows)?.count ?? 0;
};

const selectOne = async (model: string, whereClause: SqlFragment): Promise<Record<string, unknown> | null> => {
  const query = withLimit(withWhere(selectFrom(model), whereClause), 1);
  const rows = await query;
  return first(rows) ?? null;
};

export const clickHouseAdapter = (config: ClickHouseAdapterConfig = {}) =>
  createAdapterFactory({
    config: {
      adapterId: 'clickhouse',
      adapterName: 'ClickHouse',
      usePlural: config.usePlural ?? false,
      debugLogs: config.debugLogs ?? false,
      supportsJSON: false,
      supportsDates: true,
      supportsBooleans: false,
      supportsNumericIds: false
    },
    adapter: ({ getFieldName }) => {
      const buildCondition = (cond: WhereCondition, model: string): SqlFragment => {
        const { value, operator } = cond;
        const fieldName = getFieldName({ model, field: cond.field });
        const formattedValue = formatDateValue(value);
        const field = sql`${sql.identifier(fieldName)}`;
        const param = sql`${sql.param(formattedValue, 'String')}`;

        const formatArrayValues = () =>
          Array.isArray(value) ? value.map((v) => formatDateValue(v)) : [formatDateValue(value)];

        const operatorMap: Record<WhereOperator, () => SqlFragment> = {
          eq: () => sql`${field} = ${param}`,
          ne: () => sql`${field} != ${param}`,
          gt: () => sql`${field} > ${param}`,
          gte: () => sql`${field} >= ${param}`,
          lt: () => sql`${field} < ${param}`,
          lte: () => sql`${field} <= ${param}`,
          contains: () => sql`${field} ILIKE ${sql.param(`%${String(value)}%`, 'String')}`,
          starts_with: () => sql`${field} ILIKE ${sql.param(`${String(value)}%`, 'String')}`,
          ends_with: () => sql`${field} ILIKE ${sql.param(`%${String(value)}`, 'String')}`,
          in: () => {
            const vals = formatArrayValues();
            return vals.length === 0 ? sql`1=1` : sql`${field} IN (${sql.param(vals, 'String')})`;
          },
          not_in: () => {
            const vals = formatArrayValues();
            return vals.length === 0 ? sql`1=1` : sql`${field} NOT IN (${sql.param(vals, 'String')})`;
          }
        };

        return operatorMap[operator]();
      };

      const buildWhereClause = (where: WhereCondition[] | undefined, model: string): SqlFragment => {
        if (!where || isEmpty(where)) return sql`1=1`;

        const [firstCond, ...rest] = where;
        const clause = buildCondition(firstCond, model);

        for (const cond of rest) {
          clause.append(cond.connector === 'OR' ? sql` OR ` : sql` AND `);
          clause.append(buildCondition(cond, model));
        }

        return clause;
      };

      const buildInsertQuery = (model: string, data: Record<string, unknown>): SqlFragment => {
        const { columns, values } = buildColumnValuePairs(data, model, getFieldName);
        const query = sql`INSERT INTO ${sql.identifier(model)} (`;
        query.append(columns);
        query.append(sql`) VALUES (`);
        query.append(values);
        query.append(sql`)`);
        return query;
      };

      const buildSetClause = (data: Record<string, unknown>, model: string): SqlFragment => {
        const entries = Object.entries(data);
        if (isEmpty(entries)) throw new Error('No fields to update');

        return joinSql(
          entries.map(
            ([key, value]) =>
              sql`${sql.identifier(getFieldName({ model, field: key }))} = ${sql.param(formatDateValue(value), 'String')}`
          ),
          sql`, `
        );
      };

      return {
        create: async ({ model, data }) => {
          await buildInsertQuery(model, data).command();
          return data;
        },

        findOne: async ({ model, where }) => {
          const result = await selectOne(model, buildWhereClause(where, model));
          return result;
        },

        findMany: async ({ model, where, limit, offset, sortBy }) => {
          const whereClause = buildWhereClause(where, model);
          let query = withWhere(selectFrom(model), whereClause);

          if (sortBy) {
            query = withOrderBy(query, sortBy.field, sortBy.direction);
          } else if (offset) {
            query = withOrderBy(query, 'id');
          }

          if (limit) {
            query = withLimit(query, limit);
          }

          if (offset) {
            query = withOffset(query, offset);
          }

          return query;
        },

        count: async ({ model, where }) => {
          return executeCount(model, buildWhereClause(where, model));
        },

        update: async ({ model, where, update: updateData }) => {
          const safeData = omit(updateDataSchema.parse(updateData), ['id', 'createdAt', 'updatedAt']);
          const whereClause = buildWhereClause(where, model);

          if (!isEmpty(safeData)) {
            const setClause = buildSetClause(safeData, model);
            await buildUpdateQuery(model, setClause, whereClause).command();
          }

          return selectOne(model, buildWhereClause(where, model));
        },

        updateMany: async ({ model, where, update: updateData }) => {
          const safeData = omit(updateDataSchema.parse(updateData), ['id', 'createdAt', 'updatedAt']);
          const whereClause = buildWhereClause(where, model);
          const count = await executeCount(model, whereClause);

          if (!isEmpty(safeData) && count > 0) {
            const setClause = buildSetClause(safeData, model);
            await buildUpdateQuery(model, setClause, buildWhereClause(where, model)).command();
          }

          return count;
        },

        delete: async ({ model, where }) => {
          const whereClause = buildWhereClause(where, model);
          await buildDeleteQuery(model, whereClause).command();
        },

        deleteMany: async ({ model, where }) => {
          const whereClause = buildWhereClause(where, model);
          const count = await executeCount(model, whereClause);

          if (count > 0) {
            await buildDeleteQuery(model, buildWhereClause(where, model)).command();
          }

          return count;
        }
      } as CustomAdapter;
    }
  });
