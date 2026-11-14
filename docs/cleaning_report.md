# Cleaning report

Counts from scripts/process_firms.py (generated, not hand-edited).

- rows_read: 297,375,833
- dropped_not_vegetation_fire: 18,058,954
- dropped_frp_missing_or_nonpositive: 61,437
- dropped_low_confidence: 23,000,577
- dropped_duplicate_date_from_other_file: 26,308,682
- rows_kept: 229,946,183

## Coverage
- NOAA-20: 2018-04-01 to 2018-11-30, 0 gap(s): []
- Terra: 2000-11-01 to 2026-11-14, 8 gap(s): [['2001-06-16', '2001-07-02'], ['2002-03-20', '2002-03-27'], ['2002-04-15', '2002-04-15'], ['2003-12-17', '2003-12-23'], ['2008-12-21', '2008-12-22'], ['2016-02-19', '2016-02-27'], ['2022-10-11', '2022-10-22'], ['2026-01-12', '2026-01-12']]
- Aqua: 2002-07-04 to 2026-11-14, 3 gap(s): [['2002-07-30', '2002-08-07'], ['2002-09-13', '2002-09-13'], ['2022-04-01', '2022-04-16']]
- SNPP: 2012-01-20 to 2018-11-30, 1 gap(s): [['2012-03-25', '2012-03-25']]