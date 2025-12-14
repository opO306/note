$targetDir = Resolve-Path "src/screens"
Write-Host "Target Directory: $targetDir"

$files = Get-ChildItem -Path $targetDir -Recurse -Include *.tsx, *.ts

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content

    # 1. UI Components
    $content = $content -replace 'from "\./ui/', 'from "@/components/ui/'
    
    # 2. Firebase (Depth 1)
    $content = $content -replace 'from "\.\./firebase"', 'from "@/firebase"'
    # 2. Firebase (Depth 2)
    $content = $content -replace 'from "\.\./\.\./firebase"', 'from "@/firebase"'
    # 2. Firebase (Depth 3)
    $content = $content -replace 'from "\.\./\.\./\.\./firebase"', 'from "@/firebase"'

    # 3. ToastHelper
    $content = $content -replace 'from "\.\./toastHelper"', 'from "@/toastHelper"'

    # 4. Hooks (Common)
    $content = $content -replace 'from "\./hooks/use', 'from "@/components/hooks/use'

    # 5. Icons
    $content = $content -replace 'from "\./icons/', 'from "@/components/icons/'

    if ($content -ne $originalContent) {
        Write-Host "Updating: $($file.Name)"
        $content | Set-Content -Path $file.FullName -Encoding UTF8
    }
}
Write-Host "Done!"
