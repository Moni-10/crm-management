# Excel data profile (Phase 3)

Source: `output_small/` (15 parts of `ALL REAL DATA`, plus `JS CALLING` and `NEW WHAT'S APP CALLING PRINTOUT`).
Read-only analysis; nothing was loaded into the database.

## Size

| Sheet | Rows | Valid mobile | No/blank contact | Foreign / malformed number |
|---|---|---|---|---|
| ALL REAL DATA | 311,020 | 292,968 | 13,147 | 4,905 |
| JS CALLING | 3,729 | 3,631 | 63 | 35 |
| NEW WHAT'S APP | 196 | 195 | 0 | 1 |
| **Total** | **314,945** | **296,794** | **13,210** | **4,941** |

All three sheets have the same 7 columns: `sno, date, machine, location, coming, contact, email`.

## What each column really contains

| Column | Reality | Plan |
|---|---|---|
| `sno` | Not reliable: 370 duplicates and 626 out-of-order values in the main sheet, 44 non-numbers. The last sheet continues at 305,254 (overlaps the main sheet's range). | Ignore as an identifier. Keep it as `source_sno` for reference; use the sheet + row position as the unique key. |
| `date` | **Mostly not a date.** 11,337 real dates, 252,134 blank, 47,549 free text like `real 29-7`, `z`, `send to intresting data`, `final order`, `azad 6-6` (1,645 distinct values). It is a batch/tag/note field. | Real dates -> `lead_date`. Everything else -> `batch_tag` (kept, searchable, filterable). |
| `machine` | Free text, 15,956 distinct values in the main sheet (`paper bag`, `paper bag making machine .`, `paper bag $$`, `tissu paper making machine`...). 1,747 blank. | Keep the original in `machine`; add a `machine_category` filled by keyword rules (paper bag, flexo, roto/gravure, tissue, tape, slitting, lamination, coating, foil, cup/plate...). Unmatched -> `Other`. |
| `location` | 5,225 distinct values: a mix of states, cities and misspellings (`maharashtra` / `maharastra`, `gujrat`, `karnatka`, `up` / `u.p` / `uttar pradesh`); some are even staff names (`summi`: 13,728 rows). 163,794 blank (53%). | Keep original in `location_raw`; derive `state` (and `city` where obvious) with a mapping table covering the common spellings. Anything unmapped stays searchable by raw text. |
| `coming` | Not a place: it is the **caller/stage tag** (`neha mdm` 16.7k, `pooja mdm` 13.3k, `pooja 1st` 12k, `aman mdm`...) plus status notes (`hold`, `purchased`, `dealer`, `whats app`). 70% blank. | Store as `assigned_note` (text). Optionally map `<name> mdm / 1st / 2nd` to a salesperson + stage later. |
| `contact` | Numbers stored as int (257k), text (47k) or float. 23,092 rows hold **2+ numbers** (`8208728112, 9922623237`, double-space separated). 15,351 have non-breaking spaces. 4,905 are foreign (`880...` Bangladesh, `977...` Nepal, `971...`) or broken. | Split into all numbers; normalize Indian mobiles to 10 digits (strip `+91`, `0`, spaces, `\xa0`). Keep foreign numbers as digits with an `is_international` flag. Primary = first valid number; all numbers go to `lead_contacts` so any can be searched. |
| `email` | 17,226 non-email values in the main sheet: notes (`only wtsapp`, `call after 2 pm.`), typos (`...07082gmail.com`), and **two emails in one cell**. 34% blank. | Extract every valid email from the cell (first = `email`, others kept). Leftover text -> `email_note`. |

## Duplicates (decision needed)

- 209,334 distinct primary mobile numbers across ~293k valid rows.
- **59,043 numbers appear on more than one row (146,503 rows).** Top ones repeat 55, 40, 27 times.
- If we kept one row per number we would remove about **87,460** rows (28%), but we would also lose the different machine/notes on each row.

## Proposed cleaning rules

1. Trim whitespace, strip control chars and `\xa0`; empty strings -> NULL.
2. Phones: split on `, ; / newline` and double spaces; digits only; Indian mobile = 10 digits starting 6-9 (after removing `91`/`0` prefix). Others kept as international/invalid with a flag. Nothing is dropped for a bad phone.
3. Emails: lowercase, extract all valid addresses, leftover text to `email_note`.
4. Dates: only true dates become `lead_date`; text goes to `batch_tag`.
5. Machines: keep raw + keyword-based category.
6. Locations: keep raw + state/city mapping (editable table, so you can fix spellings later without re-importing).
7. Every imported row keeps `source_sheet` and `source_row` so any row can be traced to the Excel file, and re-running the import never duplicates.
8. Rows that are completely empty are skipped (none found so far).

## Decisions I need from you

1. **Duplicates:** keep **all 314,945 rows** and flag repeats (nothing lost, you can filter "duplicate numbers" and review), or **merge** repeated numbers into one lead with a history of all their machine/notes entries? (Recommended: keep all rows now, add a duplicate flag and a "show one per number" filter; merging can be done later.)
2. **`coming` column:** keep it as plain text, or should `<name> mdm / 1st / 2nd` be linked to your Salespersons list?
3. **Rows with no valid contact (18,151):** import them anyway (recommended, they still have machine/location/email) or skip them?
