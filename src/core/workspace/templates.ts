import { LANGUAGE_EXTENSIONS } from "../../types/config";

const CPP_TEMPLATE = `#include <bits/stdc++.h>
using namespace std;

// Write your solution here

int main() {
    // For testing locally
    return 0;
}
`;

const PYTHON_TEMPLATE = `# Write your solution here

`;

const JAVA_TEMPLATE = `class Solution {
    // Write your solution here
}
`;

const JAVASCRIPT_TEMPLATE = `// Write your solution here

`;

const TEMPLATES: Record<string, string> = {
  cpp: CPP_TEMPLATE,
  python: PYTHON_TEMPLATE,
  python3: PYTHON_TEMPLATE,
  java: JAVA_TEMPLATE,
  javascript: JAVASCRIPT_TEMPLATE,
  typescript: JAVASCRIPT_TEMPLATE,
};

export function getTemplate(language: string): string {
  const ext = LANGUAGE_EXTENSIONS[language] || language;
  return TEMPLATES[ext] || `// Write your solution here\n`;
}
