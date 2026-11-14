# Cleaning report

Counts from scripts/process_firms.py (generated, not hand-edited).

- rows_read: 82,876,767
- dropped_not_vegetation_fire: 3,675,752
- dropped_frp_missing_or_nonpositive: 14,577
- dropped_low_confidence: 3,557,837
- dropped_duplicate_date_from_other_file: 17,901,478
- rows_kept: 57,727,123

## Coverage
- Terra: 2000-11-01 to 2017-11-30, 6 gap(s): [['2001-06-16', '2001-07-02'], ['2002-03-20', '2002-03-27'], ['2002-04-15', '2002-04-15'], ['2003-12-17', '2003-12-23'], ['2008-12-21', '2008-12-22'], ['2013-12-01', '2016-11-30']]
- Aqua: 2002-07-04 to 2017-11-30, 3 gap(s): [['2002-07-30', '2002-08-07'], ['2002-09-13', '2002-09-13'], ['2013-12-01', '2016-11-30']]