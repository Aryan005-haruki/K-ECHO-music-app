$src = "C:\Users\ARYAN\.gemini\antigravity\brain\cf5da5d6-4c21-4b80-b469-28ea37af91fd\k_echo_logo_1778226725175.png"
$dest = "d:\aryan project\music app\NeonPulse\assets"
Copy-Item $src "$dest\icon.png" -Force
Copy-Item $src "$dest\adaptive-icon.png" -Force
Copy-Item $src "$dest\splash-icon.png" -Force
Copy-Item $src "$dest\favicon.png" -Force
Write-Host "Logo copied successfully!"
