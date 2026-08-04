with open('src/App.tsx', 'r') as f:
    content = f.read()
target = "const { toPng } = await import('html-to-image');"
replacement = ""
if target in content:
    with open('src/App.tsx', 'w') as f:
        f.write(content.replace(target, replacement))
    print("Patched toPng import successfully")
