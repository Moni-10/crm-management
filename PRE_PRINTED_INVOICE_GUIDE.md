# Pre-Printed Invoice Printing System — Complete Guide

## Overview

Your CRM now includes a sophisticated **Pre-Printed Invoice Printing System** that allows you to print quotation data ONLY onto the blank areas of your existing pre-printed MOHINDRA MECHANICAL WORKS Proforma Invoice paper.

## Two Printing Modes

### Mode 1: Pre-Printed Paper Mode (PRIMARY)
**Use this when printing on your physical pre-printed invoices.**

- Prints ONLY the dynamic data (customer details, machine details, amounts)
- Does NOT print letterhead, borders, headings, or existing text
- Prevents duplicate printing of company information
- Requires printer calibration for exact alignment
- Outputs exactly ONE A4 page

### Mode 2: Full Invoice PDF Mode (BACKUP)
**Use this when printing on blank paper or sending to customers.**

- Prints the complete invoice with letterhead, borders, and all formatting
- Includes company details, terms, and signature lines
- Can be saved as PDF or printed directly
- No calibration needed

## How to Use the Pre-Printed System

### Step 1: Create or Open a Quotation

1. Click **Quotations** in the sidebar
2. Click **+ Add Quotation** or click **Edit** on an existing quotation
3. Fill in all quotation details:
   - Select Party (auto-fills company details)
   - Enter machines
   - Set quantities and unit prices
   - Add notes/terms if needed

### Step 2: Access Pre-Printed Mode

From the **Quotations Table:**
- Click the **Pre-Print** button (orange) on any saved quotation

OR

From the **Form Page:**
- Click the **Pre-Print** button (orange) in the form action buttons

### Step 3: Printer Calibration (ONE-TIME SETUP)

When you first open Pre-Printed mode:

1. Click **Calibration Settings** button
2. Review the current offset values:
   - **Horizontal Offset (mm)**: Moves text left/right
   - **Vertical Offset (mm)**: Moves text up/down
   - **Font Size (pt)**: Adjusts text size
   - **Line Height**: Adjusts spacing between lines

3. Click **Print Test Sheet** to print on plain A4 paper
4. Place the test sheet on top of your original invoice
5. Hold up to a light source and check alignment:
   - Customer details should fit in the upper-left customer box
   - References should align with reference lines
   - Machines should fit in the particulars table
   - Amount should align in the Rs. column

### Step 4: Fine-Tune Alignment

If text is not perfectly aligned:

1. **Text too far LEFT?** → Increase Horizontal Offset (move slider right)
2. **Text too far RIGHT?** → Decrease Horizontal Offset (move slider left)
3. **Text too HIGH on page?** → Increase Vertical Offset (move slider right)
4. **Text too LOW on page?** → Decrease Vertical Offset (move slider left)
5. **Text too small?** → Increase Font Size
6. **Lines too cramped?** → Increase Line Height

6. After each adjustment, click **Print Test Sheet** to verify
7. Repeat until perfectly aligned
8. Click **Save & Close** to save your calibration

### Step 5: Print on Pre-Printed Paper

1. Insert your pre-printed invoice paper into your printer
2. In Pre-Printed Mode, click **Print on Pre-Printed Paper**
3. Select your printer from the system print dialog
4. Verify paper size is A4 and scale is 100%
5. Print!

## What Gets Printed Where

### Customer Information Box (Upper Left)
- Company Name
- Party Name
- Full Address

Prints at position: **X: 25mm, Y: 65mm**

### Reference Fields (Left Side)
- Our Reference: Quotation number
- Our Date: Quotation date

Prints at positions: **X: 25mm, Y: 130-138mm**

### Machine Particulars (Center Area)
- Machine names
- Models
- Specifications
- Quantities
- Unit prices

Prints at position: **X: 25mm, Y: 155mm**

### Amount Fields (Right Side)
- Total amount in Rupees

Prints at position: **X: 170mm, Y: 230mm**

## Browser Print Settings

When the print dialog opens:

```
Paper Size:       A4 (Portrait)
Orientation:      Portrait
Scale:            100% (Actual Size) — DO NOT use "Fit to Page"
Margins:          None (if available)
Headers/Footers:  OFF
```

⚠️ **IMPORTANT:** Different printers have minimum margins (usually 5-10mm). Check your printer's specifications if text cuts off at the edges.

## Printer Calibration Settings Storage

Calibration settings are saved in your browser's local storage and persist across sessions.

**To reset calibration:**
1. Click **Calibration Settings**
2. Click the **Reset** button to clear all offsets
3. Re-calibrate if needed

**To use different printers:**
- Save different calibration profiles by manually adjusting offsets each time
- Or use a printer with consistent behavior

## Full Invoice PDF Mode

For complete invoices with letterhead:

1. Open any quotation
2. Click **PDF** button to download full invoice PDF
3. Click **Print** button to print full invoice directly

This mode is useful for:
- Sending emails to customers
- Archiving in your records
- Printing when you run out of pre-printed paper

## Complete Workflow Example

### Scenario: Print quotation for XYZ Company

1. **Open Quotations Page**
   - Click "Quotations" in sidebar

2. **Create Quotation**
   - Click "+ Add Quotation"
   - Select "XYZ Company" from parties
   - Add machines: Paper Converter Model X1, Qty 1, ₹500,000
   - Click "Pre-Print" button

3. **First-Time Setup (if needed)**
   - Click "Calibration Settings"
   - Print test sheet on plain A4
   - Check alignment against original
   - Adjust offsets if needed
   - Save calibration

4. **Print on Pre-Printed Paper**
   - Insert pre-printed invoice into printer
   - Click "Print on Pre-Printed Paper"
   - Select printer, confirm A4 & 100% scale
   - Print!

5. **Result**
   - Customer details printed in customer box
   - Machines printed in table area
   - Amount printed in Rs. column
   - No duplicate letterhead or borders

## Important Notes

### Paper Quality & Feeding
- Pre-printed paper must feed evenly to avoid skew
- Smooth, flat pre-printed sheets work best
- Some printers may have minimum margins that crop slightly

### Text Overflow Prevention
- System automatically truncates long machine names (40 chars)
- If content overflows, reduce font size in calibration settings
- Maximum 5-6 machine lines fit in the particulars area

### Printer Variations
- **Inkjet printers:** May have 5mm+ margins
- **Laser printers:** Usually more precise (3-5mm margins)
- **Thermal printers:** Not recommended for A4 pre-printed forms

### Different Printers?
- Each printer may need different calibration
- Test on plain paper first
- Save your offset values for future reference

## Troubleshooting

### Text appears in wrong position
→ Use Calibration Settings to adjust offsets with test sheets

### Some machines don't print
→ Reduce font size in calibration to fit more lines

### Letterhead / borders print twice
→ Make sure you're using "Pre-Print Mode", not "Full Invoice"

### Print dialog won't open
→ Check browser popup blocker settings
→ Ensure you're using an up-to-date browser

### Content appears cut off
→ Check printer settings - disable "Fit to Page"
→ Verify "Scale" is set to 100%
→ Check for printer minimum margins

## Features & Capabilities

✅ **Implemented:**
- Two separate print modes (Pre-Printed & Full Invoice)
- Millimeter-based positioning system
- Printer calibration with persistent settings
- Test sheet printing for alignment verification
- Overlay preview
- One-page guarantee (no overflow)
- Support for 5+ machine details per invoice
- Local storage of calibration profiles
- Full customer details auto-fill from CRM
- Real-time preview of positioning

✅ **Maintained:**
- All existing CRM functionality
- Dashboard, Calendar, Weather
- Salespersons, Parties, Search
- Full Invoice PDF for backup
- All previous quotation features

## Technical Details

### Component: PrePrintedInvoice.jsx
- Handles both preview and calibration modes
- Manages printer offset calculations
- Generates print-optimized HTML
- Stores calibration in localStorage
- Provides real-time iframe preview

### Print CSS
- A4 portrait dimensions (210mm × 297mm)
- Absolute positioning with mm units
- Print-only styling
- No scaling
- Single page output

### Data Fields Printed
- Company Name
- Party Name
- Full Address
- Quotation Number (Our Ref)
- Quotation Date (Our Date)
- Machine Names
- Machine Quantities
- Unit Prices
- Total Amount

## Support & Updates

If you experience any issues or need custom field positioning:

1. Note the exact offset values needed
2. Document which printer was used
3. Save your working calibration
4. Contact support with your offset values

---

**Your Pre-Printed Invoice System is ready to use! Print your first quotation today.**
