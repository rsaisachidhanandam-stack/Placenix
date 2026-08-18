// ============================================================
// PLACENIX — VIRTUAL INTERVIEW SIMULATION STATIC DATA POOLS
// ============================================================

export   const staticQuestionPool = [
    // Existing 30 technical questions
    { category: "technical", q: "What is the time complexity of binary search?", opts: ["O(n)", "O(n log n)", "O(log n)", "O(1)"], ans: 2 },
    { category: "technical", q: "Which data structure is based on the LIFO principle?", opts: ["Queue", "Tree", "Stack", "Graph"], ans: 2 },
    { category: "technical", q: "What does SQL stand for?", opts: ["Structured Query Language", "Strong Question Language", "Structured Question Language", "Standard Query Language"], ans: 0 },
    { category: "technical", q: "In OOP, what is polymorphism?", opts: ["Data hiding", "Many forms", "Inheriting attributes", "Code separation"], ans: 1 },
    { category: "technical", q: "Which algorithm is used for finding the shortest path?", opts: ["Kruskal's", "Dijkstra's", "Merge Sort", "DFS"], ans: 1 },
    { category: "technical", q: "What is a primary key in a database?", opts: ["Unique identifier", "Foreign reference", "Indexed column", "Null value field"], ans: 0 },
    { category: "technical", q: "Which HTTP method is idempotent?", opts: ["POST", "PATCH", "PUT", "CONNECT"], ans: 2 },
    { category: "technical", q: "What does CSS stand for?", opts: ["Creative Style Sheets", "Cascading Style Sheets", "Computer Style Sheets", "Colorful Style Sheets"], ans: 1 },
    { category: "technical", q: "Which one is not a NoSQL database?", opts: ["MongoDB", "Cassandra", "PostgreSQL", "Redis"], ans: 2 },
    { category: "technical", q: "What is the purpose of a load balancer?", opts: ["Database indexing", "Traffic distribution", "Code compiling", "Memory management"], ans: 1 },
    { category: "technical", q: "Which sorting algorithm has the worst-case time complexity of O(n^2)?", opts: ["Merge Sort", "Heap Sort", "Quick Sort", "Radix Sort"], ans: 2 },
    { category: "technical", q: "What is the main function of the OSI model's Network layer?", opts: ["Routing", "Encryption", "Error detection", "Physical transmission"], ans: 0 },
    { category: "technical", q: "In Git, what command saves your changes to the local repository?", opts: ["git push", "git save", "git commit", "git stash"], ans: 2 },
    { category: "technical", q: "What does API stand for?", opts: ["Application Programming Interface", "Advanced Programming Interface", "Automated Program Integration", "Applied Protocol Interface"], ans: 0 },
    { category: "technical", q: "Which concept allows a class to derive properties from another class?", opts: ["Encapsulation", "Inheritance", "Abstraction", "Polymorphism"], ans: 1 },
    { category: "technical", q: "What is a deadlock in an operating system?", opts: ["Memory leak", "Infinite loop", "Processes stuck waiting for each other", "CPU overload"], ans: 2 },
    { category: "technical", q: "Which language is primarily used for iOS app development?", opts: ["Java", "Swift", "Kotlin", "Ruby"], ans: 1 },
    { category: "technical", q: "What is the primary role of a CDN (Content Delivery Network)?", opts: ["Database scaling", "Edge caching for faster delivery", "Load balancing", "DNS routing"], ans: 1 },
    { category: "technical", q: "What does JSON stand for?", opts: ["JavaScript Object Notation", "Java Syntax Object Network", "JavaScript Output Name", "Java System Object Native"], ans: 0 },
    { category: "technical", q: "Which design pattern restricts instantiation of a class to one object?", opts: ["Factory", "Observer", "Singleton", "Decorator"], ans: 2 },
    { category: "technical", q: "In Python, what is a decorator?", opts: ["A UI library", "A function modifying another function", "A class attribute", "A syntax error handling method"], ans: 1 },
    { category: "technical", q: "What is Docker primarily used for?", opts: ["Virtual Machines", "Containerization", "Version Control", "Continuous Integration"], ans: 1 },
    { category: "technical", q: "What does MVC stand for?", opts: ["Model View Controller", "Main Visual Component", "Model Variable Class", "Microservice Virtual Container"], ans: 0 },
    { category: "technical", q: "Which encryption type uses a public and private key pair?", opts: ["Symmetric", "Asymmetric", "Hashing", "Encoding"], ans: 1 },
    { category: "technical", q: "What is the DOM in web development?", opts: ["Document Object Model", "Data Origin Management", "Document Output Mechanism", "Data Object Map"], ans: 0 },
    { category: "technical", q: "Which memory is volatile?", opts: ["ROM", "Flash Memory", "RAM", "Hard Drive"], ans: 2 },
    { category: "technical", q: "What is the time complexity of searching in a balanced BST?", opts: ["O(n)", "O(1)", "O(n^2)", "O(log n)"], ans: 3 },
    { category: "technical", q: "What is the default port for HTTP?", opts: ["443", "80", "22", "21"], ans: 1 },
    { category: "technical", q: "Which of the following is a CSS preprocessor?", opts: ["SASS", "Babel", "Webpack", "React"], ans: 0 },
    { category: "technical", q: "What principle states that software entities should be open for extension but closed for modification?", opts: ["Single Responsibility", "Liskov Substitution", "Open-Closed", "Dependency Inversion"], ans: 2 },
    { category: "technical", q: "What is the main purpose of a database transaction's ACID properties?", opts: ["To ensure atomicity, consistency, isolation, and durability", "To optimize index lookup speed", "To compress tabular data storage", "To encrypt database connections"], ans: 0 },
    { category: "technical", q: "In networking, what is the role of the DNS (Domain Name System)?", opts: ["To encrypt web traffic", "To map domain names to IP addresses", "To balance traffic load", "To assign local IP addresses dynamically"], ans: 1 },
    { category: "technical", q: "Which of the following is true about a compiler?", opts: ["It executes code line-by-line", "It translates high-level code into machine code in one go", "It is used to debug network packets", "It manages database replication"], ans: 1 },
    { category: "technical", q: "What is the time complexity of inserting an element at the beginning of a singly linked list?", opts: ["O(1)", "O(n)", "O(log n)", "O(n log n)"], ans: 0 },
    { category: "technical", q: "What is the main difference between a process and a thread?", opts: ["A process shares memory with other processes; a thread does not", "A process has its own address space; threads share the process's address space", "Threads are managed by the hardware; processes are managed by the application", "Processes are faster to create than threads"], ans: 1 },
    { category: "technical", q: "In Git, what is the purpose of 'git rebase'?", opts: ["To delete a branch permanently", "To apply commits on top of another base tip", "To download files from remote repository without merging", "To encrypt local commit logs"], ans: 1 },
    { category: "technical", q: "What is a memory leak?", opts: ["A physical failure of RAM modules", "Unused memory that is not released back to the system", "Accessing memory locations outside array bounds", "Overwriting read-only memory segments"], ans: 1 },
    { category: "technical", q: "Which sorting algorithm is stable and has a worst-case complexity of O(n log n)?", opts: ["Quick Sort", "Merge Sort", "Bubble Sort", "Selection Sort"], ans: 1 },
    { category: "technical", q: "What is the purpose of the garbage collector in languages like Java or C#?", opts: ["To delete unused source code files", "To automatically reclaim unused memory", "To optimize database queries", "To clear temporary browser cookies"], ans: 1 },
    { category: "technical", q: "In system design, what does horizontal scaling refer to?", opts: ["Upgrading the CPU and RAM of an existing server", "Adding more servers to the pool", "Optimizing database queries to run horizontally", "Reducing the physical height of rack servers"], ans: 1 },
    { category: "technical", q: "What is the primary function of the ARP (Address Resolution Protocol)?", opts: ["Resolving IP addresses to MAC addresses", "Resolving domain names to IP addresses", "Routing packets across different networks", "Managing active socket connections"], ans: 0 },
    { category: "technical", q: "In cryptography, what is the primary feature of a cryptographic hash function?", opts: ["It is easily reversible", "It maps arbitrary-size data to a fixed-size bit string and is one-way", "It requires a public-private key pair", "It compresses text without losing data"], ans: 1 },
    { category: "technical", q: "What is the main benefit of using a RESTful API?", opts: ["It requires a persistent socket connection", "It is stateless and utilizes standard HTTP methods", "It automatically compiles source code", "It operates only on relational database engines"], ans: 1 },
    { category: "technical", q: "What does the term 'Race Condition' mean in concurrent programming?", opts: ["An algorithm completing ahead of schedule", "Multiple threads accessing shared data concurrently, leading to unpredictable outcomes", "A hardware metric for CPU speed comparison", "A fast routing path in network topologies"], ans: 1 },
    { category: "technical", q: "In database design, what is 'Normalization' used for?", opts: ["To secure database credentials", "To minimize data redundancy and dependency", "To convert SQL queries to NoSQL format", "To backup data automatically"], ans: 1 },
    { category: "technical", q: "What does the 'S' in SOLID principles stand for?", opts: ["System Security Principle", "Single Responsibility Principle", "State Synchronization Principle", "Stack Allocation Principle"], ans: 1 },
    { category: "technical", q: "Which HTTP response status code indicates that the server cannot find the requested resource?", opts: ["200 OK", "301 Moved Permanently", "404 Not Found", "500 Internal Server Error"], ans: 2 },
    { category: "technical", q: "What is the purpose of an index in a database table?", opts: ["To encrypt table columns", "To speed up data retrieval operations", "To ensure table constraints are enforced", "To partition tables horizontally"], ans: 1 },
    { category: "technical", q: "What is 'virtual memory' in an operating system?", opts: ["RAM allocation inside virtual machines", "Using secondary storage to extend physical memory space", "A software emulator of CPU caches", "Memory allocated for graphical operations"], ans: 1 },
    { category: "technical", q: "What is the primary difference between TCP and UDP?", opts: ["TCP is connectionless; UDP is connection-oriented", "TCP is reliable and guarantees packet delivery; UDP is connectionless and faster", "TCP operates at the physical layer; UDP operates at the network layer", "UDP is more secure than TCP"], ans: 1 },

    // Quantitative Aptitude
    { category: "quantitative", q: "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?", opts: ["120 metres", "150 metres", "324 metres", "180 metres"], ans: 1 },
    { category: "quantitative", q: "If 5 workers can build a wall in 12 days, how many days would it take for 6 workers to build the same wall?", opts: ["10 days", "8 days", "14 days", "12 days"], ans: 0 },
    { category: "quantitative", q: "A father is 4 times as old as his son. In 20 years, he will be twice as old as his son. How old is the father now?", opts: ["32 years", "40 years", "48 years", "50 years"], ans: 1 },
    { category: "quantitative", q: "Find the missing number in the series: 3, 5, 9, 17, 33, ?", opts: ["45", "50", "65", "55"], ans: 2 },
    { category: "quantitative", q: "What is the probability of getting a sum of 9 when two dice are thrown simultaneously?", opts: ["1/9", "1/6", "1/12", "1/4"], ans: 0 },
    { category: "quantitative", q: "If a person sells an item for $300, making a 25% profit, what was the cost price of the item?", opts: ["$240", "$220", "$250", "$270"], ans: 0 },
    { category: "quantitative", q: "A tank can be filled by Pipe A in 5 hours and emptied by Pipe B in 10 hours. If both pipes are opened together, how long will it take to fill the tank?", opts: ["8 hours", "10 hours", "6 hours", "12 hours"], ans: 1 },
    { category: "quantitative", q: "The average age of a class of 30 students is 15 years. If the teacher's age is included, the average increases by 1 year. What is the teacher's age?", opts: ["45 years", "46 years", "40 years", "42 years"], ans: 1 },
    { category: "quantitative", q: "A shopkeeper gives a discount of 20% on the marked price of an item and still makes a 12% profit. If the marked price is $280, what is the cost price?", opts: ["$200", "$210", "$220", "$240"], ans: 0 },
    { category: "quantitative", q: "If 3x + 7 = 22, what is the value of (x^2 - x)?", opts: ["20", "15", "12", "30"], ans: 0 },
    // Additional Quantitative Questions (10 more)
    { category: "quantitative", q: "A boat can travel with a speed of 13 km/hr in still water. If the speed of the stream is 4 km/hr, find the time taken by the boat to go 68 km downstream.", opts: ["3 hours", "4 hours", "5 hours", "6 hours"], ans: 1 },
    { category: "quantitative", q: "A sum of money at simple interest amounts to $815 in 3 years and to $854 in 4 years. What is the sum?", opts: ["$650", "$690", "$698", "$700"], ans: 2 },
    { category: "quantitative", q: "A and B invest in a business in the ratio 3:2. If 5% of the total profit goes to charity and A's share is $855, the total profit is:", opts: ["$1425", "$1500", "$1537", "$1575"], ans: 1 },
    { category: "quantitative", q: "The cost price of 20 articles is the same as the selling price of x articles. If the profit is 25%, find the value of x.", opts: ["15", "16", "18", "25"], ans: 1 },
    { category: "quantitative", q: "If 20% of a = b, then b% of 20 is the same as:", opts: ["4% of a", "5% of a", "20% of a", "None of these"], ans: 0 },
    { category: "quantitative", q: "A starts business with $3500 and after 5 months, B joins with A as his partner. After a year, the profit is divided in the ratio 2:3. What was B's contribution in the capital?", opts: ["$7500", "$8000", "$8500", "$9000"], ans: 3 },
    { category: "quantitative", q: "In a lottery, there are 10 prizes and 25 blanks. A lottery is drawn at random. What is the probability of getting a prize?", opts: ["1/10", "2/5", "2/7", "5/7"], ans: 2 },
    { category: "quantitative", q: "A card is drawn from a pack of 52 cards. What is the probability of getting a queen of club or king of heart?", opts: ["1/13", "2/13", "1/26", "1/52"], ans: 2 },
    { category: "quantitative", q: "A and B can do a work in 12 days, B and C in 15 days, C and A in 20 days. If A, B, and C work together, in how many days will they complete the work?", opts: ["8 days", "10 days", "12 days", "15 days"], ans: 1 },
    { category: "quantitative", q: "A wheel makes 360 revolutions in one minute. Through how many radians does it turn in one second?", opts: ["6π", "12π", "18π", "24π"], ans: 1 },

    // Logical Reasoning
    { category: "logical", q: "In a code language, if 'COMPUTER' is written as 'RFUVQNPC', how is 'MEDICINE' written?", opts: ["EOJDJEFM", "EOJDEJFM", "DJEFMEOJ", "DMJFEJOE"], ans: 1 },
    { category: "logical", q: "If A is the brother of B; B is the sister of C; and C is the father of D, how is D related to A?", opts: ["Brother", "Uncle", "Nephew or Niece", "Father"], ans: 2 },
    { category: "logical", q: "Which word does not belong with the others?", opts: ["Leopard", "Cougar", "Cheetah", "Wolf"], ans: 3 },
    { category: "logical", q: "Statements: All mangoes are golden. No golden things are cheap. Conclusions: 1) Mangoes are cheap. 2) Mangoes are not cheap.", opts: ["Only conclusion 1 follows", "Only conclusion 2 follows", "Both 1 and 2 follow", "Neither 1 nor 2 follows"], ans: 1 },
    { category: "logical", q: "A person walks 4 km North, then turns Right and walks 3 km. How far is the person from the starting point?", opts: ["5 km", "7 km", "6 km", "4 km"], ans: 0 },
    { category: "logical", q: "Six faces of a cube are painted with red, blue, green, yellow, black and white colors. Red is opposite to black. Green is between red and black. Blue is adjacent to white. Yellow is adjacent to blue. If red is at the bottom, what is at the top?", opts: ["White", "Black", "Yellow", "Blue"], ans: 1 },
    { category: "logical", q: "If 'red' means 'green', 'green' means 'yellow', 'yellow' means 'blue', and 'blue' means 'black', what is the color of the clear sky?", opts: ["blue", "yellow", "black", "red"], ans: 2 },
    { category: "logical", q: "A clock shows 4:30. If the minute hand points East, in which direction does the hour hand point?", opts: ["North", "North-East", "South-East", "North-West"], ans: 1 },
    { category: "logical", q: "If the letters in the word 'CREATIVE' are arranged in alphabetical order, how many letters will remain in the same position?", opts: ["One", "Two", "Three", "None"], ans: 3 },
    { category: "logical", q: "If South-East becomes North, North-East becomes West and so on, what will West become?", opts: ["North-East", "North-West", "South-East", "South-West"], ans: 2 },
    // Additional Logical Questions (10 more)
    { category: "logical", q: "Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?", opts: ["(1/3)", "(1/8)", "(2/8)", "(1/16)"], ans: 1 },
    { category: "logical", q: "Look at this series: 7, 10, 8, 11, 9, 12, ... What number should come next?", opts: ["7", "10", "12", "13"], ans: 1 },
    { category: "logical", q: "Which word is the odd one out?", opts: ["Car", "Bicycle", "Motorcycle", "Truck"], ans: 1 },
    { category: "logical", q: "An informal gathering occurs when a group of people get together in a casual, relaxed manner. Which situation below is the best example of an Informal Gathering?", opts: ["A debating club meeting", "A family barbecue reunion", "A corporate board meeting", "A lecture at a university"], ans: 1 },
    { category: "logical", q: "If all trees have leaves, and a maple is a tree, then:", opts: ["All maple trees have leaves", "Only maple trees have leaves", "Some maples have leaves", "Leaves are only found on trees"], ans: 0 },
    { category: "logical", q: "Find the word that has the same relationship to the second word as the first two: Cup is to Coffee as Bowl is to:", opts: ["Dish", "Soup", "Spoon", "Food"], ans: 1 },
    { category: "logical", q: "Find the word that has the same relationship: Exercise is to Gym as Eating is to:", opts: ["Food", "Kitchen", "Restaurant", "Diet"], ans: 2 },
    { category: "logical", q: "Statements: All bags are pockets. All pockets are pouches. Conclusions: 1) All bags are pouches. 2) Some pouches are bags.", opts: ["Only conclusion 1 follows", "Only conclusion 2 follows", "Both 1 and 2 follow", "Neither 1 nor 2 follows"], ans: 2 },
    { category: "logical", q: "A man walks 6 km South, turns West and walks 4 km, then turns North and walks 3 km. How far is he from his starting point?", opts: ["5 km", "6 km", "7 km", "8 km"], ans: 0 },
    { category: "logical", q: "If 'pen' is 'paper', 'paper' is 'ink', 'ink' is 'eraser', and 'eraser' is 'ruler', what do you write on?", opts: ["pen", "paper", "ink", "eraser"], ans: 2 },

    // One Word Substitution (Verbal Ability - 25 questions)
    { category: "verbal", q: "A person who does not believe in the existence of God", opts: ["Theist", "Atheist", "Agnostic", "Pagan"], ans: 1 },
    { category: "verbal", q: "A collection of maps, especially of Earth", opts: ["Dictionary", "Encyclopedia", "Atlas", "Anthology"], ans: 2 },
    { category: "verbal", q: "One who compiles a dictionary", opts: ["Linguist", "Lexicographer", "Cartographer", "Biographer"], ans: 1 },
    { category: "verbal", q: "A post or office for which no salary is paid", opts: ["Honorary", "Sinecure", "Voluntary", "Charitable"], ans: 0 },
    { category: "verbal", q: "A study of ancient societies and their relics", opts: ["Anthropology", "Paleontology", "Archaeology", "Geology"], ans: 2 },
    { category: "verbal", q: "One who eats everything, both plants and meat", opts: ["Herbivorous", "Carnivorous", "Omnivorous", "Insectivorous"], ans: 2 },
    { category: "verbal", q: "A person who walks in their sleep", opts: ["Somniloquist", "Somnambulist", "Insomniac", "Hypnotist"], ans: 1 },
    { category: "verbal", q: "A book or document written by hand", opts: ["Manuscript", "Scripture", "Chronicle", "Autograph"], ans: 0 },
    { category: "verbal", q: "One who knows many languages", opts: ["Bilingual", "Linguist", "Polyglot", "Translator"], ans: 2 },
    { category: "verbal", q: "A speaker's platform or dais", opts: ["Podium", "Auditorium", "Altar", "Pulpit"], ans: 0 },
    { category: "verbal", q: "A person who is centring his thoughts on himself", opts: ["Egoist", "Egocentric", "Altruist", "Eccentric"], ans: 1 },
    { category: "verbal", q: "A remedy for all diseases or problems", opts: ["Panacea", "Antibiotic", "Elixir", "Antidote"], ans: 0 },
    { category: "verbal", q: "One who looks at the bright side of things", opts: ["Pessimist", "Optimist", "Realist", "Idealist"], ans: 1 },
    { category: "verbal", q: "A study of the human mind and behavior", opts: ["Sociology", "Psychology", "Physiology", "Philosophy"], ans: 1 },
    { category: "verbal", q: "One who travels on foot", opts: ["Pedestrian", "Traveler", "Pilgrim", "Vagabond"], ans: 0 },
    { category: "verbal", q: "A person who sells flowers", opts: ["Gardener", "Florist", "Botanist", "Horticulturist"], ans: 1 },
    { category: "verbal", q: "One who spends money recklessly and wastefully", opts: ["Miser", "Spendthrift", "Philanthropist", "Investor"], ans: 1 },
    { category: "verbal", q: "An instrument for measuring atmospheric pressure", opts: ["Thermometer", "Barometer", "Hygrometer", "Anemometer"], ans: 1 },
    { category: "verbal", q: "A state of perfect balance and stability", opts: ["Symmetry", "Equilibrium", "Stagnation", "Cohesion"], ans: 1 },
    { category: "verbal", q: "A speech or presentation delivered without preparation", opts: ["Monologue", "Sermon", "Extempore", "Debate"], ans: 2 },
    { category: "verbal", q: "One who hates mankind", opts: ["Misanthrope", "Philanthropist", "Misogynist", "Mercenary"], ans: 0 },
    { category: "verbal", q: "A person who lives a solitary life and tends to avoid other people", opts: ["Recluse", "Introvert", "Vagrant", "Hermit"], ans: 0 },
    { category: "verbal", q: "Animals that can live both on land and in water", opts: ["Reptiles", "Amphibians", "Mammals", "Aquatics"], ans: 1 },
    { category: "verbal", q: "A general pardon granted to political offenders", opts: ["Absolution", "Amnesty", "Reprieve", "Condonation"], ans: 1 },
    { category: "verbal", q: "A person who loves books and reading", opts: ["Bibliophile", "Scholar", "Intellectual", "Librarian"], ans: 0 }
  ];

export   const staticTechnicalChallenges = {
    "Software Engineer": [
      {
        title: "Reverse String in Place",
        description: `
          <p>Write a function that reverses a string. The input string is given as an array of characters <code>s</code>.</p>
          <p>You must do this by modifying the input array in-place with O(1) extra memory.</p>
          <h4 style="color:#fff; margin-top:16px;">Example 1:</h4>
          <pre style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; color:#a78bfa; margin-bottom:12px;">Input: s = ["h","e","l","l","o"]\nOutput: ["o","l","l","e","h"]</pre>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function reverseString(s) {\n  // Write your code here\n  return s.reverse();\n}",
          "Python": "def reverseString(s):\n    # Write your code here\n    s.reverse()\n    return s"
        },
        testCases: [
          { input: 's = ["h","e","l","l","o"]', output: '["o","l","l","e","h"]' },
          { input: 's = ["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]' },
          { input: 's = ["a"]', output: '["a"]' }
        ]
      },
      {
        title: "Two Sum",
        description: `
          <p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.</p>
          <p>You may assume that each input would have exactly one solution, and you may not use the same element twice.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function twoSum(nums, target) {\n  // Write your code here\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const compl = target - nums[i];\n    if (map.has(compl)) return [map.get(compl), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}",
          "Python": "def twoSum(nums, target):\n    # Write your code here\n    seen = {}\n    for i, num in enumerate(nums):\n        compl = target - num\n        if compl in seen:\n            return [seen[compl], i]\n        seen[num] = i\n    return []"
        },
        testCases: [
          { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
          { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
          { input: 'nums = [3,3], target = 6', output: '[0,1]' }
        ]
      },
      {
        title: "Valid Parentheses",
        description: `
          <p>Given a string <code>s</code> containing just the characters <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, determine if the input string is valid.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function isValid(s) {\n  const stack = [];\n  const map = { ')': '(', '}': '{', ']': '[' };\n  for (let char of s) {\n    if (['(', '{', '['].includes(char)) stack.push(char);\n    else if (stack.pop() !== map[char]) return false;\n  }\n  return stack.length === 0;\n}",
          "Python": "def isValid(s):\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in ['(', '{', '[']:\n            stack.append(char)\n        elif not stack or stack.pop() != mapping[char]:\n            return False\n    return len(stack) == 0"
        },
        testCases: [
          { input: 's = "()"', output: 'true' },
          { input: 's = "()[]{}"', output: 'true' },
          { input: 's = "(]"', output: 'false' }
        ]
      },
      {
        title: "Merge Sorted Arrays",
        description: `
          <p>Given two sorted integer arrays <code>nums1</code> and <code>nums2</code>, merge them into a single sorted array.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function merge(nums1, nums2) {\n  return [...nums1, ...nums2].sort((a,b) => a - b);\n}",
          "Python": "def merge(nums1, nums2):\n    return sorted(nums1 + nums2)"
        },
        testCases: [
          { input: 'nums1 = [1,2,3], nums2 = [2,5,6]', output: '[1,2,2,3,5,6]' },
          { input: 'nums1 = [0], nums2 = [1]', output: '[0,1]' },
          { input: 'nums1 = [4,5], nums2 = [1,2,3]', output: '[1,2,3,4,5]' }
        ]
      },
      {
        title: "Fibonacci Number",
        description: `
          <p>Calculate the <code>n</code>-th Fibonacci number. F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2).</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function fib(n) {\n  if(n <= 1) return n;\n  let a=0, b=1;\n  for(let i=2; i<=n; i++) { let temp=a+b; a=b; b=temp; }\n  return b;\n}",
          "Python": "def fib(n):\n    if n <= 1: return n\n    a, b = 0, 1\n    for _ in range(2, n+1):\n        a, b = b, a + b\n    return b"
        },
        testCases: [
          { input: 'n = 2', output: '1' },
          { input: 'n = 4', output: '3' },
          { input: 'n = 10', output: '55' }
        ]
      },
      {
        title: "Binary Search",
        description: `
          <p>Given a sorted array of integers <code>nums</code> and a <code>target</code>, write a function to search for <code>target</code> in <code>nums</code>. Return its index, or -1 if not present.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function search(nums, target) {\n  return nums.indexOf(target);\n}",
          "Python": "def search(nums, target):\n    try: return nums.index(target)\n    except: return -1"
        },
        testCases: [
          { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4' },
          { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1' },
          { input: 'nums = [5], target = 5', output: '0' }
        ]
      }
    ],
    "Data Scientist": [
      {
        title: "Mean Squared Error (MSE)",
        description: `
          <p>Write a function to calculate the Mean Squared Error (MSE) between predictions and targets.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function calculateMSE(predictions, targets) {\n  let sum = 0;\n  for(let i=0; i<predictions.length; i++) {\n    sum += Math.pow(predictions[i] - targets[i], 2);\n  }\n  return parseFloat((sum / predictions.length).toFixed(3));\n}",
          "Python": "def calculateMSE(predictions, targets):\n    diff_sq = [(p - t) ** 2 for p, t in zip(predictions, targets)]\n    return round(sum(diff_sq) / len(predictions), 3)"
        },
        testCases: [
          { input: 'predictions = [1, 2, 3], targets = [1, 4, 3]', output: '1.333' },
          { input: 'predictions = [0.5, 1.5], targets = [0.5, 1.5]', output: '0' },
          { input: 'predictions = [2, 4, 6], targets = [1, 2, 3]', output: '4.667' }
        ]
      },
      {
        title: "Calculate Median",
        description: `
          <p>Write a function to calculate the median value of an unsorted numerical array <code>arr</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function median(arr) {\n  const sorted = [...arr].sort((a,b) => a-b);\n  const mid = Math.floor(sorted.length / 2);\n  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;\n}",
          "Python": "def median(arr):\n    s = sorted(arr)\n    n = len(s)\n    if n % 2 != 0: return s[n//2]\n    return (s[n//2 - 1] + s[n//2]) / 2.0"
        },
        testCases: [
          { input: 'arr = [3, 1, 2]', output: '2' },
          { input: 'arr = [4, 1, 3, 2]', output: '2.5' },
          { input: 'arr = [10]', output: '10' }
        ]
      },
      {
        title: "Pearson Correlation Coefficient",
        description: `
          <p>Calculate Pearson's correlation coefficient r between two equal-length numerical arrays <code>x</code> and <code>y</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function pearson(x, y) {\n  return 0.85;\n}",
          "Python": "def pearson(x, y):\n    return 0.85"
        },
        testCases: [
          { input: 'x = [1,2,3], y = [2,4,6]', output: '1' },
          { input: 'x = [1,2,3], y = [2,1,5]', output: '0.76' }
        ]
      },
      {
        title: "F1 Score Calculator",
        description: `
          <p>Given <code>precision</code> and <code>recall</code> values, calculate the harmonic mean (F1 Score).</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function f1Score(precision, recall) {\n  return parseFloat((2 * (precision * recall) / (precision + recall)).toFixed(3));\n}",
          "Python": "def f1Score(precision, recall):\n    return round(2.0 * (precision * recall) / (precision + recall), 3)"
        },
        testCases: [
          { input: 'precision = 0.8, recall = 0.6', output: '0.686' },
          { input: 'precision = 1.0, recall = 1.0', output: '1' }
        ]
      },
      {
        title: "L1 Regularization (Lasso)",
        description: `
          <p>Compute the L1 regularization penalty value, which is the sum of the absolute values of the weight array <code>weights</code> multiplied by the lambda scale factor <code>lmbda</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function l1Penalty(weights, lmbda) {\n  return weights.reduce((s, w) => s + Math.abs(w), 0) * lmbda;\n}",
          "Python": "def l1Penalty(weights, lmbda):\n    return sum(abs(w) for w in weights) * lmbda"
        },
        testCases: [
          { input: 'weights = [1.5, -2.0, 0.5], lmbda = 0.1', output: '0.4' },
          { input: 'weights = [0, 0], lmbda = 0.5', output: '0' }
        ]
      },
      {
        title: "Z-Score Normalization",
        description: `
          <p>Standardize an array of numerical values using standard score formula: <code>z = (x - mean) / std</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function zScore(val, mean, std) {\n  return parseFloat(((val - mean) / std).toFixed(3));\n}",
          "Python": "def zScore(val, mean, std):\n    return round((val - mean) / std, 3)"
        },
        testCases: [
          { input: 'val = 120, mean = 100, std = 15', output: '1.333' },
          { input: 'val = 85, mean = 100, std = 10', output: '-1.5' }
        ]
      }
    ],
    "Product Manager": [
      {
        title: "SQL Daily Active Users (DAU) & Retention",
        description: `
          <p>Calculate Day-1 Retention rate from the table user_sessions.</p>
        `,
        languages: ["SQL"],
        templates: {
          "SQL": "SELECT COUNT(DISTINCT s2.user_id) * 100.0 / COUNT(DISTINCT s1.user_id) AS day_1_retention FROM user_sessions s1 LEFT JOIN user_sessions s2 ON s1.user_id = s2.user_id AND s2.login_date = s1.login_date + INTERVAL '1 day';"
        },
        testCases: [
          { input: "Query structure check", output: "Valid Day-1 Retention Join Query" }
        ]
      },
      {
        title: "SQL Monthly Revenue Growth",
        description: `
          <p>Calculate month-over-month revenue growth percentage from the table <code>orders(order_id, user_id, amount, order_date)</code>.</p>
        `,
        languages: ["SQL"],
        templates: {
          "SQL": "SELECT month, revenue, (revenue - LAG(revenue) OVER(ORDER BY month)) * 100.0 / LAG(revenue) OVER(ORDER BY month) AS mom_growth FROM monthly_rev;"
        },
        testCases: [
          { input: "Query structure check", output: "Valid MoM Growth LAG query" }
        ]
      },
      {
        title: "SQL Customer Churn Rate",
        description: `
          <p>Write an SQL query to calculate the monthly customer churn rate from the table <code>subscriptions(sub_id, user_id, start_date, end_date)</code>.</p>
        `,
        languages: ["SQL"],
        templates: {
          "SQL": "SELECT COUNT(CASE WHEN end_date IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) AS churn_rate FROM subscriptions;"
        },
        testCases: [
          { input: "Query structure check", output: "Valid Churn calculation query" }
        ]
      },
      {
        title: "SQL Top Selling Products",
        description: `
          <p>Write an SQL query to find the top 3 selling products based on total sales revenue from <code>sales(sale_id, product_id, quantity, price)</code>.</p>
        `,
        languages: ["SQL"],
        templates: {
          "SQL": "SELECT product_id, SUM(quantity * price) AS total_revenue FROM sales GROUP BY product_id ORDER BY total_revenue DESC LIMIT 3;"
        },
        testCases: [
          { input: "Query structure check", output: "Valid Top-3 Revenue GROUP BY query" }
        ]
      },
      {
        title: "SQL Average Order Value",
        description: `
          <p>Find the average order value (AOV) per transaction from <code>orders(order_id, amount)</code>.</p>
        `,
        languages: ["SQL"],
        templates: {
          "SQL": "SELECT AVG(amount) AS average_order_value FROM orders;"
        },
        testCases: [
          { input: "Query structure check", output: "Valid AOV AVG query" }
        ]
      },
      {
        title: "SQL High-Value Customers",
        description: `
          <p>Identify users who spent more than $500 in total from <code>orders(user_id, amount)</code>.</p>
        `,
        languages: ["SQL"],
        templates: {
          "SQL": "SELECT user_id, SUM(amount) AS total_spent FROM orders GROUP BY user_id HAVING SUM(amount) > 500;"
        },
        testCases: [
          { input: "Query structure check", output: "Valid High-Value GROUP BY HAVING query" }
        ]
      }
    ],
    "Financial Analyst": [
      {
        title: "Compound Annual Growth Rate (CAGR)",
        description: `
          <p>Calculate CAGR given startValue, endValue, and periodYears.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function calculateCAGR(startValue, endValue, periodYears) {\n  return Math.pow(endValue / startValue, 1 / periodYears) - 1;\n}",
          "Python": "def calculateCAGR(startValue, endValue, periodYears):\n    return (endValue / startValue) ** (1.0 / periodYears) - 1.0"
        },
        testCases: [
          { input: 'startValue = 100, endValue = 150, periodYears = 3', output: '0.145' },
          { input: 'startValue = 1000, endValue = 2000, periodYears = 5', output: '0.149' },
          { input: 'startValue = 500, endValue = 500, periodYears = 10', output: '0' }
        ]
      },
      {
        title: "Net Present Value (NPV)",
        description: `
          <p>Calculate the Net Present Value (NPV) given a <code>rate</code> (discount rate) and an array of cash flows <code>cashflows</code> where index 0 is initial outlay.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function calculateNPV(rate, cashflows) {\n  return cashflows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + rate, t), 0);\n}",
          "Python": "def calculateNPV(rate, cashflows):\n    return sum(cf / ((1.0 + rate) ** t) for t, cf in enumerate(cashflows))"
        },
        testCases: [
          { input: 'rate = 0.1, cashflows = [-1000, 500, 700]', output: '37.19' },
          { input: 'rate = 0.05, cashflows = [-100, 105]', output: '0' }
        ]
      },
      {
        title: "Weighted Average Cost of Capital (WACC)",
        description: `
          <p>Calculate Weighted Average Cost of Capital (WACC) given weight of equity <code>we</code>, weight of debt <code>wd</code>, cost of equity <code>re</code>, cost of debt <code>rd</code>, and corporate tax rate <code>tax</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function calculateWACC(we, wd, re, rd, tax) {\n  return (we * re) + (wd * rd * (1 - tax));\n}",
          "Python": "def calculateWACC(we, wd, re, rd, tax):\n    return (we * re) + (wd * rd * (1.0 - tax))"
        },
        testCases: [
          { input: 'we=0.6, wd=0.4, re=0.10, rd=0.06, tax=0.25', output: '0.078' },
          { input: 'we=1.0, wd=0.0, re=0.12, rd=0.05, tax=0.30', output: '0.12' }
        ]
      },
      {
        title: "Return on Investment (ROI)",
        description: `
          <p>Calculate ROI given the <code>initialValue</code> and the <code>finalValue</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function calculateROI(initialValue, finalValue) {\n  return (finalValue - initialValue) / initialValue;\n}",
          "Python": "def calculateROI(initialValue, finalValue):\n    return (finalValue - initialValue) / float(initialValue)"
        },
        testCases: [
          { input: 'initialValue = 1000, finalValue = 1500', output: '0.5' },
          { input: 'initialValue = 200, finalValue = 100', output: '-0.5' }
        ]
      },
      {
        title: "Sharpe Ratio",
        description: `
          <p>Calculate the Sharpe Ratio given the portfolio return <code>rp</code>, risk-free rate <code>rf</code>, and portfolio standard deviation <code>sigma</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function sharpeRatio(rp, rf, sigma) {\n  return parseFloat(((rp - rf) / sigma).toFixed(3));\n}",
          "Python": "def sharpeRatio(rp, rf, sigma):\n    return round((rp - rf) / sigma, 3)"
        },
        testCases: [
          { input: 'rp = 0.12, rf = 0.03, sigma = 0.15', output: '0.6' },
          { input: 'rp = 0.08, rf = 0.02, sigma = 0.05', output: '1.2' }
        ]
      },
      {
        title: "Debt-to-Equity Ratio",
        description: `
          <p>Calculate Debt-to-Equity Ratio given total <code>liabilities</code> and total <code>equity</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function debtToEquity(liabilities, equity) {\n  return liabilities / equity;\n}",
          "Python": "def debtToEquity(liabilities, equity):\n    return liabilities / float(equity)"
        },
        testCases: [
          { input: 'liabilities = 50000, equity = 100000', output: '0.5' },
          { input: 'liabilities = 0, equity = 100', output: '0' }
        ]
      }
    ]
  };
