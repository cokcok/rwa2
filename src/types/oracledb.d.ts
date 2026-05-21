// Type declarations for oracledb module
// Supports namespace-style usage: oracledb.Pool, oracledb.Connection, etc.

interface OraclePool {
  getConnection(): Promise<OracleConnection>
  close(drainTime?: number): Promise<void>
}

interface OracleConnection {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute<T = any>(sql: string, params?: Record<string, unknown>, options?: Record<string, unknown>): Promise<{ rows?: T[]; outBinds?: unknown; rowsAffected?: number }>
  close(): Promise<void>
}

declare namespace oracledb {
  type Pool = OraclePool
  type Connection = OracleConnection
  type BindParameters = Record<string, unknown>
  type ExecuteOptions = Record<string, unknown>
  type PoolAttributes = Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Result<T = any> = { rows?: T[]; outBinds?: unknown; rowsAffected?: number }
}

declare module 'oracledb' {
  const oracledb: {
    createPool(config: Record<string, unknown>): Promise<OraclePool>
    initOracleClient(options: { libDir: string }): void
    OUT_FORMAT_OBJECT: number
    BIND_OUT: number
    NUMBER: number
    DATE: number
    STRING: number
    thin: boolean
    versionString: string
  }
  export default oracledb
}
