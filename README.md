QA-Focused Inventory Management System

ENSE707 Software Quality Assurance — Group Project (Assessment 1: Mid-Project Report)

A prototype Inventory Management System (IMS) that replaces a spreadsheet + separate barcode-scanner workflow with a single database-backed system. Stock is updated automatically from barcode scans at checkout, low-stock notifications are generated automatically, product codes follow an enforced template, and products can be tracked in more than one unit size (e.g. 1 box = 30 units).

Problem

Stores that manage inventory with spreadsheets (using barcodes only to look up prices) run into:

Slow, error-prone manual stock recounts, causing under/overstocking
Products going unrestocked for weeks because no one notices they're out
Inconsistent product naming/coding, causing duplicate or ambiguous entries
No real security or reliable backups on a plain spreadsheet

Stores that bolt a separate barcode-manager app onto the spreadsheet get a second problem: the two systems drift out of sync (different product names, mismatched data, separate backups), and every new product has to be entered twice.
