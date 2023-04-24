const express = require('express')
const router = express.Router()
const promisePool = require('../config/mysql.js').promisePool
const SqlString = require('sqlstring')

// GET - 得到單筆資料(注意，有動態參數時要寫在GET區段最後面)
router.get('/:orderId', async function (req, res, next) {
  const orderId = req.params.orderId

  if (!orderId) {
    return res.json({ message: 'error', code: '400' })
  }

  // 使用SqlString.format先產生sql方便除錯用
  const sql = 'SELECT * FROM order_form WHERE order_id=?'
  const formatSql = SqlString.format(sql, [orderId])

  console.log(formatSql)

  try {
    const [rows, fields] = await promisePool.query(formatSql)
    console.log(rows)

    if (rows.length > 0) {
      return res.json({ message: 'success', code: '200', order: rows[0] })
    } else {
      return res.json({ message: 'fail', code: '204' })
    }
  } catch (error) {
    console.log('error occurred: ', error)
    return res.json({ message: 'error', code: '500' })
  }
})
// GET - 得到所有訂購表單資料
router.get('/', async function (req, res, next) {
  const sql = 'SELECT * FROM order_form'
  try {
    const [rows, fields] = await promisePool.query(sql)
    console.log(rows)

    if (rows.length > 0) {
      return res.json({ message: 'success', code: '200', order: rows })
    } else {
      return res.json({ message: 'fail', code: '204', order: [] })
    }
  } catch (error) {
    console.log('error occurred: ', error)
    return res.json({ message: 'error', code: '500' })
  }
})

// POST - 新增訂購表單資料
router.post('/', async function (req, res, next) {
  const orderform = req.body

  console.log(orderform)

  // 檢查從react來的資料
  if (
    !orderform.order_recipient ||
    !orderform.order_phone ||
    !orderform.order_address
  ) {
    return res.json({ message: 'fail', code: '400' })
  }

  // 先查詢資料庫是否有同ordername的資料
  const sql = 'SELECT COUNT(*) AS count FROM order_form WHERE order_recipient=?'
  const formatSql = SqlString.format(sql, [orderform.order_recipient])

  try {
    // insert new row to db
    const [rows, fields] = await promisePool.query(formatSql)

    if (rows[0].count > 0) {
      return res.json({ message: 'fail', code: '409' })
    }
  } catch (error) {
    console.log('db error occurred: ', error)
    return res.json({ message: 'error', code: '500' })
  }

  // 產生sql字串
  const set = []
  let setSql = ''
  let insertSql = ''

  for (const [key, value] of Object.entries(orderform)) {
    if (value) {
      // SqlString.escape是為了防止SQL Injection
      set.push(`${key} = ${SqlString.escape(value)}`)
    }
  }

  setSql = ` SET ` + set.join(`, `)

  insertSql = `INSERT INTO order_form ${setSql}`

  console.log(insertSql)

  try {
    // insert new row to db
    const [result] = await promisePool.query(insertSql)

    if (result.insertId) {
      return res.json({
        message: 'success',
        code: '200',
        order: { ...orderform, order_id: result.insertId },
      })
    } else {
      return res.json({ message: 'fail', code: '400' })
    }
  } catch (error) {
    console.log('db error occurred: ', error)
    return res.json({ message: 'error', code: '500' })
  }
})
module.exports = router
