#!/bin/bash
# Script to replace hardcoded primary color with dynamic Tailwind primary class

find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | xargs sed -i 's/text-\[#5A5A40\]/text-primary/g'
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | xargs sed -i 's/bg-\[#5A5A40\]/bg-primary/g'
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | xargs sed -i 's/border-\[#5A5A40\]/border-primary/g'
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | xargs sed -i 's/focus:border-\[#5A5A40\]/focus:border-primary/g'
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | xargs sed -i 's/focus:ring-\[#5A5A40\]/focus:ring-primary/g'
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | xargs sed -i 's/shadow-\[#5A5A40\]/shadow-primary/g'
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | xargs sed -i 's/selection:bg-\[#5A5A40\]/selection:bg-primary/g'
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | xargs sed -i 's/selection:text-\[#5A5A40\]/selection:text-primary/g'
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | xargs sed -i 's/fill-\[#5A5A40\]/fill-primary/g'
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | xargs sed -i 's/stroke-\[#5A5A40\]/stroke-primary/g'

# Handle some edge cases with transparency or arbitrary values in style objects
find src -type f \( -name "*.tsx" -o -name "*.ts" \) | xargs sed -i 's/#5A5A40/var(--brand-primary)/g'

echo "Conversion complete."
