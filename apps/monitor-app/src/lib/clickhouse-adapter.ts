import { createAdapterFactory, type CustomAdapter, type DBAdapterDebugLogOption } from 'better-auth/adapters';
import { sql } from '@/app/server/lib/clickhouse/client';

interface ClickHouseAdapterConfig {
  debugLogs?: DBAdapterDebugLogOption;
  usePlural?: boolean;
}

interface WhereCondition {
  field: string;
  value?: unknown;
  operator: string;
  connector: 'AND' | 'OR';
}

type SqlFragment = ReturnType<typeof sql<Record<string, unknown>>>;

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
      supportsNumericIds: false,
    },
    adapter: ({ getFieldName }) => {
      const formatDateValue = (value: unknown): unknown => {
        if (value instanceof Date) {
          return value.toISOString().slice(0, 19).replace('T', ' ');
        }
        return value;
      };

      const buildCondition = (cond: WhereCondition, model: string): SqlFragment => {
        const { value, operator } = cond;
        const fieldName = getFieldName({ model, field: cond.field });
        const formattedValue = formatDateValue(value);

        switch (operator) {
          case 'eq':
            return sql`${sql.identifier(fieldName)} = ${sql.param(formattedValue, 'String')}`;
          case 'ne':
            return sql`${sql.identifier(fieldName)} != ${sql.param(formattedValue, 'String')}`;
          case 'gt':
            return sql`${sql.identifier(fieldName)} > ${sql.param(formattedValue, 'String')}`;
          case 'gte':
            return sql`${sql.identifier(fieldName)} >= ${sql.param(formattedValue, 'String')}`;
          case 'lt':
            return sql`${sql.identifier(fieldName)} < ${sql.param(formattedValue, 'String')}`;
          case 'lte':
            return sql`${sql.identifier(fieldName)} <= ${sql.param(formattedValue, 'String')}`;
          case 'contains':
            return sql`${sql.identifier(fieldName)} ILIKE ${sql.param(`%${String(value)}%`, 'String')}`;
          case 'startsWith':
          case 'starts_with':
            return sql`${sql.identifier(fieldName)} ILIKE ${sql.param(`${String(value)}%`, 'String')}`;
          case 'endsWith':
          case 'ends_with':
            return sql`${sql.identifier(fieldName)} ILIKE ${sql.param(`%${String(value)}`, 'String')}`;
          case 'in': {
            const vals = Array.isArray(value) ? value.map(formatDateValue) : [formatDateValue(value)];
            if (vals.length === 0) return sql`1=1`;
            return sql`${sql.identifier(fieldName)} IN (${sql.param(vals, 'String')})`;
          }
          case 'notIn':
          case 'not_in': {
            const vals = Array.isArray(value) ? value.map(formatDateValue) : [formatDateValue(value)];
            if (vals.length === 0) return sql`1=1`;
            return sql`${sql.identifier(fieldName)} NOT IN (${sql.param(vals, 'String')})`;
          }
          default:
            return sql`${sql.identifier(fieldName)} = ${sql.param(formattedValue, 'String')}`;
        }
      };

      const buildWhereClause = (where: WhereCondition[] | undefined, model: string): SqlFragment => {
        if (!where || !Array.isArray(where) || where.length === 0) {
          return sql`1=1`;
        }

        const clause = buildCondition(where[0], model);

        for (let i = 1; i < where.length; i++) {
          const cond = where[i];
          const condition = buildCondition(cond, model);
          if (cond.connector === 'OR') {
            clause.append(sql` OR `);
            clause.append(condition);
          } else {
            clause.append(sql` AND `);
            clause.append(condition);
          }
        }

        return clause;
      };

      const formatDataForInsert = (data: Record<string, unknown>): Record<string, unknown> => {
        const formatted: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
          formatted[key] = formatDateValue(value);
        }
        return formatted;
      };

      const buildInsertQuery = (model: string, data: Record<string, unknown>): SqlFragment => {
        const formatted = formatDataForInsert(data);
        const entries = Object.entries(formatted);
        
        if (entries.length === 0) {
          throw new Error('No fields to insert');
        }

        const [firstKey, firstValue] = entries[0];
        const columns = sql`${sql.identifier(getFieldName({ model, field: firstKey }))}`;
        const values = sql`${sql.param(firstValue, 'String')}`;

        for (let i = 1; i < entries.length; i++) {
          const [key, value] = entries[i];
          columns.append(sql`, ${sql.identifier(getFieldName({ model, field: key }))}`);
          values.append(sql`, ${sql.param(value, 'String')}`);
        }

        const query = sql`INSERT INTO ${sql.identifier(model)} (`;
        query.append(columns);
        query.append(sql`) VALUES (`);
        query.append(values);
        query.append(sql`)`);
        return query;
      };

      const buildUpdateSet = (data: Record<string, unknown>, model: string): SqlFragment => {
        const entries = Object.entries(data);
        if (entries.length === 0) {
          throw new Error('No fields to update');
        }

        const [firstKey, firstValue] = entries[0];
        const setClause = sql`${sql.identifier(getFieldName({ model, field: firstKey }))} = ${sql.param(formatDateValue(firstValue), 'String')}`;

        for (let i = 1; i < entries.length; i++) {
          const [key, value] = entries[i];
          setClause.append(sql`, ${sql.identifier(getFieldName({ model, field: key }))} = ${sql.param(formatDateValue(value), 'String')}`);
        }

        return setClause;
      };

      return {
        create: async ({ model, data }: any) => {
          const query = buildInsertQuery(model, data);
          await query.command();
          return data;
        },

        findOne: async ({ model, where }: any) => {
          const whereClause = buildWhereClause(where, model);
          const query = sql`SELECT * FROM ${sql.identifier(model)} FINAL WHERE `;
          query.append(whereClause);
          query.append(sql` LIMIT 1`);
          const rows = await query;
          return rows[0] || null;
        },

        findMany: async ({ model, where, limit, offset, sortBy }: any) => {
          const whereClause = buildWhereClause(where, model);
          const query = sql`SELECT * FROM ${sql.identifier(model)} FINAL WHERE `;
          query.append(whereClause);

          if (sortBy) {
            query.append(sql` ORDER BY ${sql.identifier(sortBy.field)}`);
            query.append(sortBy.direction === 'desc' ? sql` DESC` : sql` ASC`);
          } else if (offset) {
            query.append(sql` ORDER BY ${sql.identifier('id')}`);
          }

          if (limit) {
            query.append(sql` LIMIT ${sql.param(limit, 'UInt32')}`);
          } else if (offset) {
            query.append(sql` LIMIT ${sql.param(1000000, 'UInt32')}`);
          }

          if (offset) {
            query.append(sql` OFFSET ${sql.param(offset, 'UInt32')}`);
          }

          return query;
        },

        count: async ({ model, where }: any) => {
          const whereClause = buildWhereClause(where, model);
          const query = sql`SELECT count() as count FROM ${sql.identifier(model)} FINAL WHERE `;
          query.append(whereClause);
          const rows = await query as { count: string }[];
          return Number(rows[0]?.count) || 0;
        },

        update: async ({ model, where, update: updateData }: any) => {
          const safeData = Object.fromEntries(
            Object.entries(updateData as Record<string, unknown>)
              .filter(([k]) => !['id', 'createdAt', 'updatedAt'].includes(k))
          );

          const whereClause = buildWhereClause(where, model);

          if (Object.keys(safeData).length > 0) {
            const setClause = buildUpdateSet(safeData, model);
            const updateQuery = sql`ALTER TABLE ${sql.identifier(model)} UPDATE `;
            updateQuery.append(setClause);
            updateQuery.append(sql` WHERE `);
            updateQuery.append(whereClause);
            updateQuery.append(sql` SETTINGS mutations_sync=1`);
            await updateQuery.command();
          }

          const selectQuery = sql`SELECT * FROM ${sql.identifier(model)} FINAL WHERE `;
          selectQuery.append(buildWhereClause(where, model));
          selectQuery.append(sql` LIMIT 1`);
          const rows = await selectQuery;
          return rows[0] || null;
        },

        updateMany: async ({ model, where, update: updateData }: any) => {
          const safeData = Object.fromEntries(
            Object.entries(updateData as Record<string, unknown>)
              .filter(([k]) => !['id', 'createdAt', 'updatedAt'].includes(k))
          );

          const whereClause = buildWhereClause(where, model);
          const countQuery = sql`SELECT count() as count FROM ${sql.identifier(model)} FINAL WHERE `;
          countQuery.append(whereClause);
          const rows = await countQuery as { count: string }[];
          const count = Number(rows[0]?.count) || 0;

          if (Object.keys(safeData).length > 0 && count > 0) {
            const setClause = buildUpdateSet(safeData, model);
            const updateQuery = sql`ALTER TABLE ${sql.identifier(model)} UPDATE `;
            updateQuery.append(setClause);
            updateQuery.append(sql` WHERE `);
            updateQuery.append(buildWhereClause(where, model));
            updateQuery.append(sql` SETTINGS mutations_sync=1`);
            await updateQuery.command();
          }

          return count;
        },

        delete: async ({ model, where }: any) => {
          const whereClause = buildWhereClause(where, model);
          const query = sql`ALTER TABLE ${sql.identifier(model)} DELETE WHERE `;
          query.append(whereClause);
          query.append(sql` SETTINGS mutations_sync=1`);
          await query.command();
        },

        deleteMany: async ({ model, where }: any) => {
          const whereClause = buildWhereClause(where, model);
          const countQuery = sql`SELECT count() as count FROM ${sql.identifier(model)} FINAL WHERE `;
          countQuery.append(whereClause);
          const rows = await countQuery as { count: string }[];
          const count = Number(rows[0]?.count) || 0;

          if (count > 0) {
            const deleteQuery = sql`ALTER TABLE ${sql.identifier(model)} DELETE WHERE `;
            deleteQuery.append(buildWhereClause(where, model));
            deleteQuery.append(sql` SETTINGS mutations_sync=1`);
            await deleteQuery.command();
          }

          return count;
        },
      } as CustomAdapter;
    }
  });
