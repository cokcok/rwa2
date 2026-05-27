import oracledb from './oracle-init'

// Oracle connection pool (singleton)
let pool: oracledb.Pool | null = null

// สร้าง connection pool (lazy initialization)
export async function initializePool(): Promise<oracledb.Pool> {
  if (pool) {
    return pool
  }

  // ข้ามการเชื่อมต่อถ้าใช้ mock data
  if (process.env.USE_MOCK_DATA === 'true') {
    throw new Error('Oracle connection skipped - using mock data')
  }

  const config: oracledb.PoolAttributes = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SERVICE_NAME}`,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1,
    poolTimeout: 60,
    stmtCacheSize: 30
  }

  try {
    pool = await oracledb.createPool(config)
    console.log('Oracle connection pool created successfully')
    return pool
  } catch (error) {
    console.error('Failed to create Oracle connection pool:', error)
    throw error
  }
}

// ดึง connection จาก pool
export async function getConnection(): Promise<oracledb.Connection> {
  const p = await initializePool()
  return await p.getConnection()
}

// Execute query ด้วย parameterized queries
export async function executeQuery<T>(
  sql: string,
  params: oracledb.BindParameters = {},
  options: oracledb.ExecuteOptions = {}
): Promise<T[]> {
  let connection: oracledb.Connection | null = null

  try {
    connection = await getConnection()

    // ตั้งค่า default options
    const executeOptions: oracledb.ExecuteOptions = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...options
    }

    const result = await connection.execute(sql, params, executeOptions)

    return (result.rows || []) as T[]
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  } finally {
    if (connection) {
      try {
        await connection.close()
      } catch (error) {
        console.error('Error closing connection:', error)
      }
    }
  }
}

// Execute insert/update/delete
export async function executeNonQuery(
  sql: string,
  params: oracledb.BindParameters = {},
  options: oracledb.ExecuteOptions = {}
): Promise<oracledb.Result<unknown>> {
  let connection: oracledb.Connection | null = null

  try {
    connection = await getConnection()

    const executeOptions: oracledb.ExecuteOptions = {
      autoCommit: true,
      ...options
    }

    const result = await connection.execute(sql, params, executeOptions)
    return result
  } catch (error) {
    console.error('Database execute error:', error)
    throw error
  } finally {
    if (connection) {
      try {
        await connection.close()
      } catch (error) {
        console.error('Error closing connection:', error)
      }
    }
  }
}

// Execute query ด้วย session timezone ที่กำหนด (หลีกเลี่ยง ORA-01805)
export async function executeQueryWithSessionTz<T>(
  sql: string,
  params: oracledb.BindParameters = {},
  timezone: string = '+07:00'
): Promise<T[]> {
  let connection: oracledb.Connection | null = null

  try {
    connection = await getConnection()

    // กำหนด session timezone เป็น numeric offset
    // เพื่อไม่ต้องค้น timezone region name → ไม่เกิด ORA-01805
    await connection.execute(`ALTER SESSION SET TIME_ZONE = '${timezone}'`)

    const result = await connection.execute(sql, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    })

    return (result.rows || []) as T[]
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  } finally {
    if (connection) {
      try {
        await connection.close()
      } catch (error) {
        console.error('Error closing connection:', error)
      }
    }
  }
}

// ปิด connection pool
export async function closePool(): Promise<void> {
  if (pool) {
    try {
      await pool.close(10)
      pool = null
      console.log('Oracle connection pool closed')
    } catch (error) {
      console.error('Error closing pool:', error)
      throw error
    }
  }
}
