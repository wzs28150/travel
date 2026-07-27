import fs from 'fs'
import mysql from 'mysql2/promise'

const sql = fs.readFileSync(new URL('./init.sql', import.meta.url), 'utf8')

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  multipleStatements: true,
})

await conn.query(sql)
await conn.end()
console.log('schema ready (travel_db + users + travels)')
