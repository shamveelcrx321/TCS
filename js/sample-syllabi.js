/**
 * AI Question Paper Generator - Sample Syllabi Library
 * Provides pre-loaded academic syllabi across different domains for instant testing.
 */

window.SAMPLE_SYLLABI = {
    "data-structures": {
        id: "data-structures",
        subject: "Data Structures and Algorithms",
        courseCode: "CST302",
        department: "Department of Computer Science & Engineering",
        institution: "NATIONAL INSTITUTE OF TECHNOLOGY",
        semester: "Semester III",
        duration: "3 Hours",
        totalMarks: 100,
        text: `
NATIONAL INSTITUTE OF TECHNOLOGY
DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
SYLLABUS: CST302 DATA STRUCTURES AND ALGORITHMS (3-1-0) 4 CREDITS

COURSE OUTCOMES (COs):
CO1: Understand and implement basic linear data structures including Arrays, Stacks, Queues, and Linked Lists.
CO2: Analyze the time and space complexity of sorting and searching algorithms using asymptotic notations.
CO3: Master non-linear data structures such as Binary Trees, Binary Search Trees, AVL Trees, and Heaps.
CO4: Formulate graph representations and apply graph traversal algorithms (BFS, DFS, Dijkstra, Minimum Spanning Trees).
CO5: Apply hashing techniques and advanced data structure design to solve real-world algorithmic problems.

MODULE 1: INTRODUCTION TO ALGORITHMS & LINEAR DATA STRUCTURES
- Concept of Abstract Data Types (ADT), Primitive vs Non-primitive Data Structures.
- Asymptotic Notations: Big-O, Omega, Theta analysis of space and time complexity.
- Arrays: Row/Column Major Ordering, Operations (Insertion, Deletion, Traversal), Sparse Matrices.
- Stacks: ADT, Array and Linked implementation, Applications (Infix to Postfix evaluation, Recursion stack, Parenthesis matching).
- Queues: Array and Linked implementation, Circular Queue, Priority Queue, Deque.

MODULE 2: LINKED LISTS & ADVANCED LINKED STRUCTURES
- Singly Linked List: Operations (Creation, Insertion at head/tail/position, Deletion, Reverse list).
- Doubly Linked List: Insertion, Deletion, Circular Doubly Linked List.
- Polynomial representation and addition using Singly Linked Lists.
- Memory allocation: Static vs Dynamic memory management, Garbage collection principles.

MODULE 3: TREES & HEAPS
- Tree Terminology: Root, Child, Parent, Leaf, Depth, Height, Degree of a tree.
- Binary Trees: Array and Pointer representations, Tree Traversals (Pre-order, In-order, Post-order, Level-order).
- Binary Search Trees (BST): Insertion, Searching, Deletion algorithm, Tree balancing concepts.
- Balanced Trees: AVL Trees - Single and Double rotations, Height analysis.
- Heaps: Min-Heap, Max-Heap, Heapify process, Heap Sort, Priority Queue implementation.

MODULE 4: GRAPH ALGORITHMS
- Graph Terminology: Directed/Undirected, Weighted/Unweighted, Connected Components, Cyclic/Acyclic.
- Graph Representations: Adjacency Matrix and Adjacency List.
- Graph Traversals: Breadth-First Search (BFS) and Depth-First Search (DFS) with applications.
- Minimum Spanning Trees (MST): Prim's Algorithm, Kruskal's Algorithm with Union-Find data structure.
- Shortest Path Algorithms: Dijkstra's Single Source Shortest Path Algorithm, Bellman-Ford Overview.

MODULE 5: SEARCHING, SORTING & HASHING
- Searching Techniques: Linear Search, Binary Search (Recursive & Iterative), Interpolation Search.
- Sorting Algorithms: Bubble Sort, Selection Sort, Insertion Sort, Quick Sort (Partitioning scheme), Merge Sort (Divide & Conquer).
- Hashing: Hash Functions (Division, Multiplication, Mid-Square), Collision Resolution Strategies (Chaining, Linear Probing, Quadratic Probing, Double Hashing), Load Factor.

EXAMINATION INSTRUCTIONS:
- Question paper consists of Part A (10 Short Questions x 2 Marks = 20 Marks), Part B (5 Medium Questions x 6 Marks = 30 Marks), and Part C (5 Long Questions x 10 Marks = 50 Marks).
- Code snippets must be written in C/C++ or Pseudocode. Clear diagrams required for tree/graph problems.
`,
        modules: [
            {
                name: "Module 1: Introduction to Algorithms & Linear Data Structures",
                weightage: 20,
                topics: [
                    { name: "Abstract Data Types & Asymptotic Complexity (Big-O, Theta, Omega)", type: "Conceptual", difficulty: "Beginner" },
                    { name: "Arrays, Memory Layouts & Sparse Matrices", type: "Numerical", difficulty: "Beginner" },
                    { name: "Stack ADT & Applications (Infix to Postfix, Recursion)", type: "Problem-Solving", difficulty: "Intermediate" },
                    { name: "Queue Variations (Circular Queue, Deque, Priority Queue)", type: "Algorithmic", difficulty: "Intermediate" }
                ]
            },
            {
                name: "Module 2: Linked Lists & Advanced Linked Structures",
                weightage: 20,
                topics: [
                    { name: "Singly Linked List Operations & Implementation", type: "Programming", difficulty: "Beginner" },
                    { name: "Doubly Linked List & Circular Linked List", type: "Programming", difficulty: "Intermediate" },
                    { name: "Polynomial Addition using Linked Lists", type: "Problem-Solving", difficulty: "Intermediate" },
                    { name: "Dynamic Memory Management & Pointer Mechanics", type: "Conceptual", difficulty: "Advanced" }
                ]
            },
            {
                name: "Module 3: Trees & Heaps",
                weightage: 25,
                topics: [
                    { name: "Binary Tree Traversals (Inorder, Preorder, Postorder)", type: "Algorithmic", difficulty: "Beginner" },
                    { name: "Binary Search Tree (BST) Operations & Deletion", type: "Programming", difficulty: "Intermediate" },
                    { name: "AVL Trees & Rotations (LL, RR, LR, RL)", type: "Problem-Solving", difficulty: "Advanced" },
                    { name: "Heapify, Heap Sort & Priority Queues", type: "Algorithmic", difficulty: "Advanced" }
                ]
            },
            {
                name: "Module 4: Graph Algorithms",
                weightage: 20,
                topics: [
                    { name: "Graph Representations (Adjacency Matrix & List)", type: "Conceptual", difficulty: "Beginner" },
                    { name: "Graph Traversals (BFS and DFS Algorithms)", type: "Algorithmic", difficulty: "Intermediate" },
                    { name: "Minimum Spanning Trees (Prim's & Kruskal's Algorithms)", type: "Problem-Solving", difficulty: "Intermediate" },
                    { name: "Shortest Path (Dijkstra's Algorithm)", type: "Problem-Solving", difficulty: "Advanced" }
                ]
            },
            {
                name: "Module 5: Searching, Sorting & Hashing",
                weightage: 15,
                topics: [
                    { name: "Searching Algorithms (Linear, Binary, Interpolation Search)", type: "Algorithmic", difficulty: "Beginner" },
                    { name: "Sorting Algorithms (Quick Sort, Merge Sort Analysis)", type: "Algorithmic", difficulty: "Intermediate" },
                    { name: "Hash Functions & Collision Resolution (Chaining, Probing)", type: "Conceptual", difficulty: "Advanced" }
                ]
            }
        ]
    },

    "university-physics": {
        id: "university-physics",
        subject: "Engineering Physics & Electromagnetism",
        courseCode: "PHY101",
        department: "Department of Physics & Applied Sciences",
        institution: "INSTITUTE OF TECHNOLOGY & SCIENCE",
        semester: "Semester I",
        duration: "3 Hours",
        totalMarks: 100,
        text: `
INSTITUTE OF TECHNOLOGY & SCIENCE
DEPARTMENT OF PHYSICS & APPLIED SCIENCES
SYLLABUS: PHY101 ENGINEERING PHYSICS (3-0-0)

MODULE 1: QUANTUM MECHANICS
- Wave-particle duality, De Broglie hypothesis, Davisson-Germer experiment.
- Heisenberg Uncertainty Principle and its applications.
- Wavefunction, Born interpretation, Time-dependent and Time-independent Schrodinger equation.
- Particle in a 1D Infinite Potential Well, Energy eigenvalues and normalized wavefunctions.

MODULE 2: ELECTROMAGNETIC THEORY
- Vector calculus fundamentals: Gradient, Divergence, Curl, Gauss and Stokes theorems.
- Maxwell's equations in differential and integral forms, Physical significance.
- Wave equation for electromagnetic waves in vacuum and dielectric media.
- Poynting vector and Poynting theorem, Energy density in EM waves.

MODULE 3: OPTICS & LASERS
- Interference in thin films, Wedge-shaped films, Newton's Rings experiment.
- Diffraction: Fraunhofer diffraction at single slit, double slit, and N-slits grating.
- Lasers: Spontaneous and Stimulated emission, Einstein's A and B coefficients, Population inversion, Optical pumping, Ruby Laser and He-Ne Laser.

MODULE 4: SEMICONDUCTOR PHYSICS & SUPERCONDUCTIVITY
- Energy bands in solids, Intrinsic and Extrinsic semiconductors, Fermi-Dirac distribution.
- Hall Effect: Hall voltage, Hall coefficient, Determination of carrier concentration and mobility.
- Superconductivity: Meissner effect, Type I and Type II superconductors, BCS theory qualitative overview, High-Tc superconductors.
`,
        modules: [
            {
                name: "Module 1: Quantum Mechanics",
                weightage: 25,
                topics: [
                    { name: "Wave-Particle Duality & Uncertainty Principle", type: "Conceptual", difficulty: "Beginner" },
                    { name: "Schrodinger Wave Equation Derivation", type: "Analytical", difficulty: "Intermediate" },
                    { name: "Particle in a 1D Box Eigenvalues", type: "Numerical", difficulty: "Advanced" }
                ]
            },
            {
                name: "Module 2: Electromagnetic Theory",
                weightage: 25,
                topics: [
                    { name: "Maxwell's Equations & Physical Significance", type: "Conceptual", difficulty: "Beginner" },
                    { name: "EM Wave Propagation in Vacuum", type: "Analytical", difficulty: "Intermediate" },
                    { name: "Poynting Vector & Energy Flux", type: "Numerical", difficulty: "Advanced" }
                ]
            },
            {
                name: "Module 3: Optics & Lasers",
                weightage: 25,
                topics: [
                    { name: "Newton's Rings & Interference", type: "Experimental", difficulty: "Beginner" },
                    { name: "Fraunhofer Single/Double Slit Diffraction", type: "Analytical", difficulty: "Intermediate" },
                    { name: "Laser Action & Einstein Coefficients", type: "Conceptual", difficulty: "Advanced" }
                ]
            },
            {
                name: "Module 4: Semiconductor Physics & Superconductivity",
                weightage: 25,
                topics: [
                    { name: "Fermi Level & Carrier Concentration", type: "Conceptual", difficulty: "Beginner" },
                    { name: "Hall Effect Experiment & Derivations", type: "Numerical", difficulty: "Intermediate" },
                    { name: "Superconductivity & Meissner Effect", type: "Conceptual", difficulty: "Advanced" }
                ]
            }
        ]
    }
};
