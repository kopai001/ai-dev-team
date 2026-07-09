# Domain — Module: รายงาน (Reports)

## ภาพรวม
Module รายงานไม่มี Entity ของตัวเอง — ทำงานด้วยการ **query** จาก Entities ของ module อื่น

---

## Report Queries หลัก

### 1. DailySales (สรุปยอดขายรายวัน)
**Source**: Order, OrderItem, Payment
```
SELECT
  date(o.created_at) as date,
  branch_id,
  COUNT(o.id) as bill_count,
  SUM(o.total_amount) as total_sales,
  SUM(o.discount_amount) as total_discount,
  AVG(o.total_amount) as avg_bill,
  SUM(CASE WHEN p.method = 'cash' THEN p.amount END) as cash_total,
  SUM(CASE WHEN p.method != 'cash' THEN p.amount END) as transfer_total
FROM orders o
JOIN payments p ON o.id = p.order_id
WHERE o.status = 'completed'
  AND o.created_at BETWEEN :start AND :end
GROUP BY date, branch_id
```

### 2. ProfitReport (รายงานกำไร)
**Source**: OrderItem, Product (cost_price)
```
กำไร = Σ(item.total_price - item.quantity × item.unit_cost)
กำไรสุทธิ = กำไรรวม - ค่าใช้จ่ายกะ (ShiftExpense)
```

### 3. StockReport (รายงานสต็อก)
**Source**: StockBalance, StockLot, StockLotBalance, StockMovement, StockCount
```
- ยอดคงเหลือปัจจุบัน: StockBalance (รวม) + StockLotBalance (แยก lot)
- ความเคลื่อนไหว: StockMovement (by type, by lot)
- Turnover rate: ยอดขาย / ยอดสต็อกเฉลี่ย
```

### 4. StockLotReport (รายงานล็อตสินค้า)
**Source**: StockLot, StockLotBalance, StockMovement
```
- รายการล็อตที่ active แยกต่อสาขา: lot_no, product, expiry_date, qty
- รายการล็อตใกล้หมดอายุ (expiry_date - today ≤ X วัน)
- รายการล็อตหมดอายุแล้ว (status = expired) พร้อม qty คงเหลือ
- ประวัติการเคลื่อนไหวต่อ lot_no (รับเข้า, ขาย, โอน, ตัด)
```

### 5. StockCountReport (รายงานผลการนับสต็อก)
**Source**: StockCount, StockCountItem
```
- ประวัติการนับสต็อกทุกครั้งต่อสาขา
- รายการ difference (counted vs system) แยกต่อสินค้า
- มูลค่าผลต่าง = |difference| × cost_price
```

### 6. ShiftReport (รายงานกะ)
**Source**: Shift, ShiftExpense, CashRemittance, Order
```
- ยอดเงินสด = opening_cash + cash_sales - expenses - remittances
- ผลต่าง = closing_cash_counted - expected_cash
```

### 7. MemberReport (รายงานสมาชิก)
**Source**: Member, PointTransaction, Order
```
- สมาชิกใหม่ = COUNT(members WHERE register_date BETWEEN :start AND :end)
- Top member = Σ total_spent ORDER BY DESC
```

---

## Calculated Metrics

| Metric | สูตร |
|--------|------|
| กำไรขั้นต้น | ยอดขาย - ต้นทุนสินค้า |
| กำไรสุทธิ | กำไรขั้นต้น - ค่าใช้จ่าย |
| อัตรากำไร | (กำไรสุทธิ / ยอดขาย) × 100 |
| Inventory Turnover | ยอดขาย / ยอดสต็อกเฉลี่ย |
| บิลเฉลี่ย | ยอดขายรวม / จำนวนบิล |
| ค่าแรงต่อบิล | ค่าแรงรวม / จำนวนบิล |

---

## Relationships (Read Only)
```
Reports query ► Order, OrderItem, Payment                    [→ module ขาย]
Reports query ► StockBalance, StockMovement                  [→ module สต็อก]
Reports query ► StockLot, StockLotBalance                    [→ module สต็อก]
Reports query ► StockCount, StockCountItem                   [→ module สต็อก]
Reports query ► Shift, ShiftExpense                          [→ module กะ]
Reports query ► Member, PointTransaction                     [→ module สมาชิก]
Reports query ► Employee                                     [→ module พนักงาน]
Reports query ► Branch                                       [→ module สาขา]
```
