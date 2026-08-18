// =============================================================================
// PLACENIX DOJO — BELT CONFIG & CHALLENGE POOLS
// White → Yellow → Orange → Green → Purple → Blue → Brown
// =============================================================================

export const DOJO_BELT_CONFIG = [
  { level: 0, id: 'white',  label: 'White Belt',  color: '#E2E8F0', textColor: '#1E293B', emoji: '⚪', hint: 'Fundamentals: variables, arithmetic, basic output' },
  { level: 1, id: 'yellow', label: 'Yellow Belt', color: '#FBBF24', textColor: '#1E293B', emoji: '🟡', hint: 'Conditionals: if/else, comparisons, decision making' },
  { level: 2, id: 'orange', label: 'Orange Belt', color: '#F97316', textColor: '#ffffff',  emoji: '🟠', hint: 'Loops: for/while, series generation, accumulation' },
  { level: 3, id: 'green',  label: 'Green Belt',  color: '#10B981', textColor: '#ffffff',  emoji: '🟢', hint: 'Nested loops, patterns, arrays, basic sorting' },
  { level: 4, id: 'purple', label: 'Purple Belt', color: '#8B5CF6', textColor: '#ffffff',  emoji: '🟣', hint: 'Hash maps, two-pointer, sliding window techniques' },
  { level: 5, id: 'blue',   label: 'Blue Belt',   color: '#3B82F6', textColor: '#ffffff',  emoji: '🔵', hint: 'Linked lists, stacks, queues, memoized recursion' },
  { level: 6, id: 'brown',  label: 'Brown Belt',  color: '#92400E', textColor: '#ffffff',  emoji: '🟤', hint: 'Trees, graphs, dynamic programming, greedy algorithms' }
];

export const dojoBeltChallenges = {
  white: [
    {
      title: 'Sum of Two Numbers',
      inputFormat: 'Two integers <code>a</code> and <code>b</code>.',
      outputFormat: 'Print <code>a + b</code>.',
      constraints: '−10^6 ≤ a, b ≤ 10^6',
      description: '<p>Write a function that accepts two integers and returns their sum.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function sum(a, b) {\n  return a + b;\n}',
        Python: 'def sum(a, b):\n    return a + b'
      },
      testCases: [
        { input: 'a = 3, b = 5', output: '8', explanation: '3 + 5 = 8' },
        { input: 'a = -1, b = 1', output: '0' },
        { input: 'a = 0, b = 100', output: '100' }
      ]
    },
    {
      title: 'Area of a Rectangle',
      inputFormat: 'Two integers <code>width</code> and <code>height</code>.',
      outputFormat: 'Print <code>width × height</code>.',
      constraints: '1 ≤ width, height ≤ 10^4',
      description: '<p>Calculate the area of a rectangle given its width and height.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function area(width, height) {\n  return width * height;\n}',
        Python: 'def area(width, height):\n    return width * height'
      },
      testCases: [
        { input: 'width = 4, height = 5', output: '20' },
        { input: 'width = 1, height = 1', output: '1' },
        { input: 'width = 100, height = 200', output: '20000' }
      ]
    },
    {
      title: 'Celsius to Fahrenheit',
      inputFormat: 'A float <code>celsius</code>.',
      outputFormat: 'Print <code>F = C × 9/5 + 32</code>.',
      constraints: '−273 ≤ celsius ≤ 10000',
      description: '<p>Convert Celsius to Fahrenheit using formula: <code>F = (C × 9/5) + 32</code>.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function toFahrenheit(c) {\n  return (c * 9/5) + 32;\n}',
        Python: 'def toFahrenheit(c):\n    return (c * 9/5) + 32'
      },
      testCases: [
        { input: 'c = 0', output: '32' },
        { input: 'c = 100', output: '212' },
        { input: 'c = -40', output: '-40' }
      ]
    }
  ],

  yellow: [
    {
      title: 'FizzBuzz',
      inputFormat: 'A single integer <code>n</code>.',
      outputFormat: 'Print "FizzBuzz", "Fizz", "Buzz", or n.',
      constraints: '1 ≤ n ≤ 10^6',
      description: '<p>Return "FizzBuzz" if divisible by 3 and 5, "Fizz" if by 3, "Buzz" if by 5, else n as a string.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function fizzBuzz(n) {\n  if (n % 15 === 0) return "FizzBuzz";\n  if (n % 3 === 0) return "Fizz";\n  if (n % 5 === 0) return "Buzz";\n  return String(n);\n}',
        Python: 'def fizzBuzz(n):\n    if n % 15 == 0: return "FizzBuzz"\n    if n % 3 == 0: return "Fizz"\n    if n % 5 == 0: return "Buzz"\n    return str(n)'
      },
      testCases: [
        { input: 'n = 15', output: 'FizzBuzz' },
        { input: 'n = 9', output: 'Fizz' },
        { input: 'n = 7', output: '7' }
      ]
    },
    {
      title: 'Maximum of Three Numbers',
      inputFormat: 'Three integers <code>a</code>, <code>b</code>, <code>c</code>.',
      outputFormat: 'Print the largest of three.',
      constraints: '−10^9 ≤ a, b, c ≤ 10^9',
      description: '<p>Return the maximum of three integers using if/else conditions. Do NOT use Math.max().</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function maxOfThree(a, b, c) {\n  if (a >= b && a >= c) return a;\n  if (b >= a && b >= c) return b;\n  return c;\n}',
        Python: 'def maxOfThree(a, b, c):\n    if a >= b and a >= c: return a\n    if b >= a and b >= c: return b\n    return c'
      },
      testCases: [
        { input: 'a = 3, b = 9, c = 5', output: '9' },
        { input: 'a = -1, b = -5, c = -2', output: '-1' },
        { input: 'a = 7, b = 7, c = 7', output: '7' }
      ]
    },
    {
      title: 'Leap Year Checker',
      inputFormat: 'A single integer <code>year</code>.',
      outputFormat: 'Print "Leap Year" or "Not a Leap Year".',
      constraints: '1 ≤ year ≤ 9999',
      description: '<p>A year is a leap year if divisible by 4, AND not by 100, UNLESS also divisible by 400.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function isLeapYear(year) {\n  if ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)) return "Leap Year";\n  return "Not a Leap Year";\n}',
        Python: 'def isLeapYear(year):\n    if (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0): return "Leap Year"\n    return "Not a Leap Year"'
      },
      testCases: [
        { input: 'year = 2000', output: 'Leap Year' },
        { input: 'year = 1900', output: 'Not a Leap Year' },
        { input: 'year = 2024', output: 'Leap Year' }
      ]
    }
  ],

  orange: [
    {
      title: 'Print First N Odd Numbers',
      inputFormat: 'A single integer <code>N</code>.',
      outputFormat: 'First N odd numbers space-separated.',
      constraints: '1 ≤ N ≤ 1000',
      description: '<p>Given N, return the first N odd numbers on a single line separated by spaces.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function firstNOdd(n) {\n  let res = [];\n  for (let i = 0; i < n; i++) res.push(2 * i + 1);\n  return res.join(" ");\n}',
        Python: 'def firstNOdd(n):\n    return " ".join(str(2 * i + 1) for i in range(n))'
      },
      testCases: [
        { input: 'n = 5', output: '1 3 5 7 9' },
        { input: 'n = 1', output: '1' },
        { input: 'n = 6', output: '1 3 5 7 9 11' }
      ]
    },
    {
      title: 'Factorial of N',
      inputFormat: 'A single integer <code>N</code>.',
      outputFormat: 'Print N!',
      constraints: '0 ≤ N ≤ 20',
      description: '<p>Calculate N! = N × (N-1) × ... × 1 using a loop. Note: 0! = 1.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function factorial(n) {\n  let res = 1;\n  for (let i = 2; i <= n; i++) res *= i;\n  return res;\n}',
        Python: 'def factorial(n):\n    res = 1\n    for i in range(2, n + 1): res *= i\n    return res'
      },
      testCases: [
        { input: 'n = 5', output: '120' },
        { input: 'n = 0', output: '1' },
        { input: 'n = 10', output: '3628800' }
      ]
    },
    {
      title: 'Sum of Digits',
      inputFormat: 'A non-negative integer <code>n</code>.',
      outputFormat: 'Sum of all digits.',
      constraints: '0 ≤ n ≤ 10^9',
      description: '<p>Find the sum of all individual digits of a number using a loop.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function digitSum(n) {\n  let sum = 0;\n  while (n > 0) { sum += n % 10; n = Math.floor(n / 10); }\n  return sum;\n}',
        Python: 'def digitSum(n):\n    s = 0\n    while n > 0:\n        s += n % 10\n        n //= 10\n    return s'
      },
      testCases: [
        { input: 'n = 1234', output: '10' },
        { input: 'n = 0', output: '0' },
        { input: 'n = 9999', output: '36' }
      ]
    }
  ],

  green: [
    {
      title: 'Star Triangle Pattern',
      inputFormat: 'Single integer <code>N</code>.',
      outputFormat: 'Right-angled star triangle N rows.',
      constraints: '1 ≤ N ≤ 20',
      description: '<p>Print a right-aligned star triangle using nested loops.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function starTriangle(n) {\n  let rows = [];\n  for (let i = 1; i <= n; i++) rows.push("*".repeat(i));\n  return rows.join("\\n");\n}',
        Python: 'def starTriangle(n):\n    return "\\n".join("*" * i for i in range(1, n + 1))'
      },
      testCases: [
        { input: 'n = 3', output: '*\n**\n***' },
        { input: 'n = 1', output: '*' },
        { input: 'n = 4', output: '*\n**\n***\n****' }
      ]
    },
    {
      title: 'Multiplication Table',
      inputFormat: 'Single integer <code>n</code>.',
      outputFormat: 'Table 1 to 10 as n x i = result.',
      constraints: '1 ≤ n ≤ 100',
      description: '<p>Print multiplication table for n from 1 to 10.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function multiTable(n) {\n  let res = [];\n  for (let i = 1; i <= 10; i++) res.push(`${n} x ${i} = ${n * i}`);\n  return res.join("\\n");\n}',
        Python: 'def multiTable(n):\n    return "\\n".join(f"{n} x {i} = {n * i}" for i in range(1, 11))'
      },
      testCases: [
        { input: 'n = 2', output: '2 x 1 = 2\n2 x 2 = 4\n2 x 3 = 6\n2 x 4 = 8\n2 x 5 = 10\n2 x 6 = 12\n2 x 7 = 14\n2 x 8 = 16\n2 x 9 = 18\n2 x 10 = 20' },
        { input: 'n = 1', output: '1 x 1 = 1\n1 x 2 = 2\n1 x 3 = 3\n1 x 4 = 4\n1 x 5 = 5\n1 x 6 = 6\n1 x 7 = 7\n1 x 8 = 8\n1 x 9 = 9\n1 x 10 = 10' },
        { input: 'n = 5', output: '5 x 1 = 5\n5 x 2 = 10\n5 x 3 = 15\n5 x 4 = 20\n5 x 5 = 25\n5 x 6 = 30\n5 x 7 = 35\n5 x 8 = 40\n5 x 9 = 45\n5 x 10 = 50' }
      ]
    },
    {
      title: 'Bubble Sort',
      inputFormat: 'Array of integers <code>nums</code>.',
      outputFormat: 'Sorted elements space-separated.',
      constraints: '1 ≤ len ≤ 100',
      description: '<p>Implement Bubble Sort with nested loops. No built-in sort.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function bubbleSort(nums) {\n  let a = [...nums];\n  for (let i = 0; i < a.length; i++) {\n    for (let j = 0; j < a.length - 1; j++) {\n      if (a[j] > a[j+1]) { let t = a[j]; a[j] = a[j+1]; a[j+1] = t; }\n    }\n  }\n  return a.join(" ");\n}',
        Python: 'def bubbleSort(nums):\n    a = list(nums)\n    for i in range(len(a)):\n        for j in range(len(a) - 1):\n            if a[j] > a[j+1]: a[j], a[j+1] = a[j+1], a[j]\n    return " ".join(str(x) for x in a)'
      },
      testCases: [
        { input: 'nums = [64, 34, 25, 12, 22, 11, 90]', output: '11 12 22 25 34 64 90' },
        { input: 'nums = [5, 1, 4, 2, 8]', output: '1 2 4 5 8' },
        { input: 'nums = [1]', output: '1' }
      ]
    }
  ],

  purple: [
    {
      title: 'Anagram Check',
      inputFormat: 'Two strings <code>s</code> and <code>t</code>.',
      outputFormat: 'Print "true" or "false".',
      constraints: '1 ≤ len ≤ 5×10^4',
      description: '<p>Check if s and t are anagrams using frequency count map.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function isAnagram(s, t) {\n  if (s.length !== t.length) return "false";\n  let m = {};\n  for (let c of s) m[c] = (m[c] || 0) + 1;\n  for (let c of t) { if (!m[c]) return "false"; m[c]--; }\n  return "true";\n}',
        Python: 'def isAnagram(s, t):\n    if len(s) != len(t): return "false"\n    d = {}\n    for c in s: d[c] = d.get(c, 0) + 1\n    for c in t:\n        if not d.get(c): return "false"\n        d[c] -= 1\n    return "true"'
      },
      testCases: [
        { input: 's = "anagram", t = "nagaram"', output: 'true' },
        { input: 's = "rat", t = "car"', output: 'false' },
        { input: 's = "listen", t = "silent"', output: 'true' }
      ]
    },
    {
      title: 'Longest Substring Without Repeating Characters',
      inputFormat: 'String <code>s</code>.',
      outputFormat: 'Length of longest non-repeating substring.',
      constraints: '0 ≤ len ≤ 5×10^4',
      description: '<p>Use sliding window to find longest substring without repeated characters.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function lengthOfLongestSubstring(s) {\n  let set = new Set(), max = 0, l = 0;\n  for (let r = 0; r < s.length; r++) {\n    while (set.has(s[r])) set.delete(s[l++]);\n    set.add(s[r]); max = Math.max(max, r - l + 1);\n  }\n  return String(max);\n}',
        Python: 'def lengthOfLongestSubstring(s):\n    st = set()\n    mx = l = 0\n    for r in range(len(s)):\n        while s[r] in st:\n            st.remove(s[l]); l += 1\n        st.add(s[r]); mx = max(mx, r - l + 1)\n    return str(mx)'
      },
      testCases: [
        { input: 's = "abcabcbb"', output: '3' },
        { input: 's = "bbbbb"', output: '1' },
        { input: 's = "pwwkew"', output: '3' }
      ]
    },
    {
      title: 'Two Sum — Hash Map',
      inputFormat: 'Array <code>nums</code> and <code>target</code>.',
      outputFormat: 'Print [i, j] indices.',
      constraints: '2 ≤ len ≤ 10^4',
      description: '<p>Find indices of two numbers that sum to target using Map O(n).</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function twoSum(nums, target) {\n  let map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    let comp = target - nums[i];\n    if (map.has(comp)) return JSON.stringify([map.get(comp), i]);\n    map.set(nums[i], i);\n  }\n}',
        Python: 'def twoSum(nums, target):\n    d = {}\n    for i, num in enumerate(nums):\n        c = target - num\n        if c in d: return f"[{d[c]},{i}]"\n        d[num] = i'
      },
      testCases: [
        { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
        { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
        { input: 'nums = [3,3], target = 6', output: '[0,1]' }
      ]
    }
  ],

  blue: [
    {
      title: 'Reverse a Linked List (Simulated)',
      inputFormat: 'Array <code>vals</code> representing nodes.',
      outputFormat: 'Reversed values space-separated.',
      constraints: '1 ≤ len ≤ 5000',
      description: '<p>Reverse a singly linked list using pointer simulation.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function reverseList(vals) {\n  return [...vals].reverse().join(" ");\n}',
        Python: 'def reverseList(vals):\n    return " ".join(str(x) for x in list(vals)[::-1])'
      },
      testCases: [
        { input: 'vals = [1,2,3,4,5]', output: '5 4 3 2 1' },
        { input: 'vals = [1,2]', output: '2 1' },
        { input: 'vals = [1]', output: '1' }
      ]
    },
    {
      title: 'Valid Parentheses (Stack)',
      inputFormat: 'String <code>s</code> with brackets.',
      outputFormat: 'Print "true" or "false".',
      constraints: '1 ≤ len ≤ 10^4',
      description: '<p>Use stack to check bracket string validity.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function isValid(s) {\n  let st = [], m = {")":"(", "]":"[", "}":"{"};\n  for (let c of s) {\n    if ("({[".includes(c)) st.push(c);\n    else if (st.pop() !== m[c]) return "false";\n  }\n  return st.length === 0 ? "true" : "false";\n}',
        Python: 'def isValid(s):\n    st = []\n    m = {")":"(", "]":"[", "}":"{"}\n    for c in s:\n        if c in "({[": st.append(c)\n        elif not st or st.pop() != m[c]: return "false"\n    return "true" if not st else "false"'
      },
      testCases: [
        { input: 's = "()"', output: 'true' },
        { input: 's = "()[]{}"', output: 'true' },
        { input: 's = "(]"', output: 'false' }
      ]
    },
    {
      title: 'Fibonacci with Memoization',
      inputFormat: 'Single integer <code>n</code>.',
      outputFormat: 'Print n-th Fibonacci.',
      constraints: '0 ≤ n ≤ 40',
      description: '<p>Compute n-th Fibonacci number using memoized recursion.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function fib(n, memo = {}) {\n  if (n <= 1) return String(n);\n  if (memo[n]) return memo[n];\n  let ans = BigInt(fib(n-1, memo)) + BigInt(fib(n-2, memo));\n  memo[n] = String(ans);\n  return String(ans);\n}',
        Python: 'def fib(n, memo={}):\n    if n <= 1: return str(n)\n    if n in memo: return memo[n]\n    memo[n] = str(int(fib(n-1, memo)) + int(fib(n-2, memo)))\n    return memo[n]'
      },
      testCases: [
        { input: 'n = 10', output: '55' },
        { input: 'n = 30', output: '832040' },
        { input: 'n = 0', output: '0' }
      ]
    }
  ],

  brown: [
    {
      title: 'Climbing Stairs (DP)',
      inputFormat: 'Integer <code>n</code> steps.',
      outputFormat: 'Distinct ways to climb top.',
      constraints: '1 ≤ n ≤ 45',
      description: '<p>Count distinct ways to climb n stairs taking 1 or 2 steps using bottom-up DP.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function climbStairs(n) {\n  if (n <= 2) return String(n);\n  let a = 1, b = 2;\n  for (let i = 3; i <= n; i++) { let c = a + b; a = b; b = c; }\n  return String(b);\n}',
        Python: 'def climbStairs(n):\n    if n <= 2: return str(n)\n    a, b = 1, 2\n    for _ in range(3, n + 1): a, b = b, a + b\n    return str(b)'
      },
      testCases: [
        { input: 'n = 2', output: '2' },
        { input: 'n = 3', output: '3' },
        { input: 'n = 10', output: '89' }
      ]
    },
    {
      title: 'Maximum Subarray (Kadane)',
      inputFormat: 'Array <code>nums</code>.',
      outputFormat: 'Max subarray sum.',
      constraints: '1 ≤ len ≤ 10^5',
      description: '<p>Find max contiguous subarray sum using Kadanes Algorithm — O(n).</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function maxSubArray(nums) {\n  let max = nums[0], curr = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    curr = Math.max(nums[i], curr + nums[i]);\n    max = Math.max(max, curr);\n  }\n  return String(max);\n}',
        Python: 'def maxSubArray(nums):\n    mx = curr = nums[0]\n    for x in nums[1:]:\n        curr = max(x, curr + x)\n        mx = max(mx, curr)\n    return str(mx)'
      },
      testCases: [
        { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6' },
        { input: 'nums = [1]', output: '1' },
        { input: 'nums = [5,4,-1,7,8]', output: '23' }
      ]
    },
    {
      title: 'Number of Islands (BFS/DFS)',
      inputFormat: '2D grid string: rows by |, cells by ,.',
      outputFormat: 'Number of islands.',
      constraints: '1 ≤ m, n ≤ 300',
      description: '<p>Count islands in 2D grid of 1 (land) and 0 (water) using BFS or DFS flood-fill.</p>',
      languages: ['JavaScript', 'Python'],
      templates: {
        JavaScript: 'function numIslands(gridStr) {\n  let grid = gridStr.split("|").map(r => r.split(","));\n  let count = 0;\n  for (let r = 0; r < grid.length; r++) {\n    for (let c = 0; c < grid[0].length; c++) {\n      if (grid[r][c] === "1") { count++; dfs(grid, r, c); }\n    }\n  }\n  function dfs(g, r, c) {\n    if (r < 0 || r >= g.length || c < 0 || c >= g[0].length || g[r][c] !== "1") return;\n    g[r][c] = "0";\n    dfs(g, r+1, c); dfs(g, r-1, c); dfs(g, r, c+1); dfs(g, r, c-1);\n  }\n  return String(count);\n}',
        Python: 'def numIslands(gridStr):\n    grid = [r.split(",") for r in gridStr.split("|")]\n    count = 0\n    def dfs(r, c):\n        if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]) or grid[r][c] != "1": return\n        grid[r][c] = "0"\n        dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1)\n    for r in range(len(grid)):\n        for c in range(len(grid[0])):\n            if grid[r][c] == "1": count += 1; dfs(r, c)\n    return str(count)'
      },
      testCases: [
        { input: 'gridStr = "1,1,1,1,0|1,1,0,1,0|1,1,0,0,0|0,0,0,0,0"', output: '1' },
        { input: 'gridStr = "1,1,0,0,0|1,1,0,0,0|0,0,1,0,0|0,0,0,1,1"', output: '3' },
        { input: 'gridStr = "1,0,0|0,1,0|0,0,1"', output: '3' }
      ]
    }
  ]
};
