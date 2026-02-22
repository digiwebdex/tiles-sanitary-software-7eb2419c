

# Challan Section Improvements

## Overview
This plan adds a dedicated **Challans** menu item in the sidebar/navigation and completely redesigns the Challan page for a cleaner, more user-friendly, and print-ready experience.

## Changes

### 1. Add "Challans" to the navigation menu
- Add a new nav item in `AppLayout.tsx` between "Sales" and "Returns":
  - Path: `/challans`
  - Label: "Challans"  
  - Icon: `FileText` (from lucide-react)

### 2. Create a Challans list page (`src/pages/challans/ChallansPage.tsx`)
- A new page that lists all challans for the dealer using `challanService.list(dealerId)`
- Shows a table with columns: Challan No, Date, Customer, Invoice Ref, Status, Actions
- Status badges with color coding (Pending = blue, Delivered = green, Cancelled = red)
- "View" button links to the challan detail page
- Filter/search by challan number or customer name

### 3. Add route for the Challans list
- Register `/challans` route in `App.tsx` wrapped with `ProtectedRoute` and `AppLayout`

### 4. Redesign the Challan document page (`ChallanPage.tsx`)
- **Cleaner toolbar**: Reorganize action buttons with clear spacing and grouping
- **Better print layout**:
  - Larger, bolder dealer branding header with a decorative border
  - Clear "DELIVERY CHALLAN" title with challan number prominently displayed
  - Properly formatted "Deliver To" and "Transport Details" sections in bordered cards
  - Clean items table with better padding, alternating rows, and rounded corners
  - Quantity summary in a horizontal bar instead of 3 separate boxes
  - Prominent signature areas with more vertical space
  - "Terms & Conditions" placeholder section
  - Footer with challan reference and date
- **Show Prices toggle** made into a proper Switch component
- **Print CSS** refined for clean A4 output with proper margins and no clipping

### Technical Details

**Files to create:**
- `src/pages/challans/ChallansPage.tsx` -- new challans list page

**Files to modify:**
- `src/components/AppLayout.tsx` -- add Challans nav item with `FileText` icon
- `src/pages/sales/ChallanPage.tsx` -- redesign the document layout for clarity and print quality
- `src/App.tsx` -- add `/challans` route

