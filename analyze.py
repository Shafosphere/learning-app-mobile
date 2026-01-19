import os
import re

def count_returns(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        # Regex for return followed by space/newline and then < or (
        matches = re.findall(r'return\s*\(?\s*<', content)
        return len(matches)
    except Exception as e:
        return 0

def main():
    start_dir = 'src'
    results = []
    for root, dirs, files in os.walk(start_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.jsx'):
                path = os.path.join(root, file)
                count = count_returns(path)
                if count > 1:
                    results.append((path, count))
    
    # Sort by count desc
    results.sort(key=lambda x: x[1], reverse=True)
    
    with open('return_analysis.txt', 'w') as f:
        for path, count in results:
            f.write(f"{path}: {count}\n")

if __name__ == '__main__':
    main()
