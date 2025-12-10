import { createAdapterFactory, type DBAdapterDebugLogOption } from 'better-auth/adapters';
import { db } from './db';

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
      const escapeValue = (value: unknown): string => {
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'number') return String(value);
        if (typeof value === 'boolean') return value ? '1' : '0';
        if (value instanceof Date) {
          return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
        }
        return `'${String(value).replace(/'/g, "''")}'`;
      };

      const buildCondition = (cond: WhereCondition, model: string): string => {
        const { value, operator } = cond;
        const field = getFieldName({ model, field: cond.field });
        
        switch (operator) {
          case 'eq':
            return `${field} = ${escapeValue(value)}`;
          case 'ne':
            return `${field} != ${escapeValue(value)}`;
          case 'gt':
            return `${field} > ${escapeValue(value)}`;
          case 'gte':
            return `${field} >= ${escapeValue(value)}`;
          case 'lt':
            return `${field} < ${escapeValue(value)}`;
          case 'lte':
            return `${field} <= ${escapeValue(value)}`;
          case 'contains':
            return `${field} ILIKE '%${String(value).replace(/'/g, "''")}%'`;
          case 'startsWith':
          case 'starts_with':
            return `${field} ILIKE '${String(value).replace(/'/g, "''")}%'`;
          case 'endsWith':
          case 'ends_with':
            return `${field} ILIKE '%${String(value).replace(/'/g, "''")}'`;
          case 'in': {
            const vals = Array.isArray(value) ? value : [value];
            if (vals.length === 0) return '1=1';
            return `${field} IN (${vals.map(escapeValue).join(', ')})`;
          }
          case 'notIn':
          case 'not_in': {
            const vals = Array.isArray(value) ? value : [value];
            if (vals.length === 0) return '1=1';
            return `${field} NOT IN (${vals.map(escapeValue).join(', ')})`;
          }
          default:
            return `${field} = ${escapeValue(value)}`;
        }
      };

      const whereClause = (where: WhereCondition[] | undefined, model: string): string => {
        if (!where || !Array.isArray(where) || where.length === 0) return '1=1';
        
        return where.map((cond, i) => {
          const condition = buildCondition(cond, model);
          if (i === 0) return condition;
          return `${cond.connector || 'AND'} ${condition}`;
        }).join(' ');
      };

      const formatDataForInsert = (data: Record<string, unknown>): Record<string, unknown> => {
        const formatted: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
          if (value instanceof Date) {
            formatted[key] = value.toISOString().slice(0, 19).replace('T', ' ');
          } else {
            formatted[key] = value;
          }
        }
        return formatted;
      };

      const formatUpdateSet = (data: Record<string, unknown>): string => {
        return Object.entries(data)
          .map(([k, v]) => `${k} = ${escapeValue(v)}`)
          .join(', ');
      };

      return {
        create: async ({ model, data }: any) => {
          const formatted = formatDataForInsert(data);
          await db.insert({ table: model, values: [formatted], format: 'JSONEachRow' });
          return data;
        },
        
        findOne: async ({ model, where }: any) => {
          const result = await db.query({ 
            query: `SELECT * FROM ${model} WHERE ${whereClause(where, model)} LIMIT 1`, 
            format: 'JSONEachRow' 
          });
          const rows = (await result.json()) as any[];
          return rows[0] || null;
        },
        
        findMany: async ({ model, where, limit, offset, sortBy }: any) => {
          let query = `SELECT * FROM ${model} WHERE ${whereClause(where, model)}`;
          if (sortBy) {
            query += ` ORDER BY ${sortBy.field} ${sortBy.direction === 'desc' ? 'DESC' : 'ASC'}`;
          } else if (offset) {
            query += ` ORDER BY id`;
          }
          if (limit) {
            query += ` LIMIT ${limit}`;
          } else if (offset) {
            query += ` LIMIT 1000000`;
          }
          if (offset) query += ` OFFSET ${offset}`;
          
          const result = await db.query({ query, format: 'JSONEachRow' });
          return result.json();
        },
        
        count: async ({ model, where }: any) => {
          const result = await db.query({ 
            query: `SELECT count() as count FROM ${model} WHERE ${whereClause(where, model)}`, 
            format: 'JSONEachRow' 
          });
          const rows = (await result.json()) as { count: string }[];
          return Number(rows[0]?.count) || 0;
        },
        
        update: async ({ model, where, update: updateData }: any) => {
          const safeData = Object.fromEntries(
            Object.entries(updateData as Record<string, unknown>)
              .filter(([k]) => !['id', 'createdAt', 'updatedAt'].includes(k))
          );
          if (Object.keys(safeData).length > 0) {
            await db.command({ 
              query: `ALTER TABLE ${model} UPDATE ${formatUpdateSet(safeData)} WHERE ${whereClause(where, model)} SETTINGS mutations_sync=1` 
            });
          }
          const result = await db.query({ 
            query: `SELECT * FROM ${model} WHERE ${whereClause(where, model)} LIMIT 1`, 
            format: 'JSONEachRow' 
          });
          const rows = (await result.json()) as any[];
          return rows[0] || null;
        },

        updateMany: async ({ model, where, update: updateData }: any) => {
          const safeData = Object.fromEntries(
            Object.entries(updateData as Record<string, unknown>)
              .filter(([k]) => !['id', 'createdAt', 'updatedAt'].includes(k))
          );
          
          const countResult = await db.query({ 
            query: `SELECT count() as count FROM ${model} WHERE ${whereClause(where, model)}`, 
            format: 'JSONEachRow' 
          });
          const rows = (await countResult.json()) as { count: string }[];
          const count = Number(rows[0]?.count) || 0;

          if (Object.keys(safeData).length > 0 && count > 0) {
            await db.command({ 
              query: `ALTER TABLE ${model} UPDATE ${formatUpdateSet(safeData)} WHERE ${whereClause(where, model)} SETTINGS mutations_sync=1` 
            });
          }
          
          return count;
        },
        
        delete: async ({ model, where }: any) => {
          await db.command({ 
            query: `ALTER TABLE ${model} DELETE WHERE ${whereClause(where, model)} SETTINGS mutations_sync=1` 
          });
        },

        deleteMany: async ({ model, where }: any) => {
          const countResult = await db.query({ 
            query: `SELECT count() as count FROM ${model} WHERE ${whereClause(where, model)}`, 
            format: 'JSONEachRow' 
          });
          const rows = (await countResult.json()) as { count: string }[];
          const count = Number(rows[0]?.count) || 0;

          if (count > 0) {
            await db.command({ 
              query: `ALTER TABLE ${model} DELETE WHERE ${whereClause(where, model)} SETTINGS mutations_sync=1` 
            });
          }
          
          return count;
        },
      };
    }
  });
