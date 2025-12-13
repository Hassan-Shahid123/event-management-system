# CampusConnect — Smart Event Management System# CampusConnect — Smart Event Management System



A TypeScript-based campus event management system demonstrating software construction principles including specifications, abstraction, parsing, concurrency, and testing.A Java-based campus event management system demonstrating software construction principles including design, specifications, abstraction, parsing, concurrency, debugging, and testing.



## 📋 Project Overview## 📋 Project Overview



CampusConnect is a centralized platform to automate and manage campus events efficiently. It allows:CampusConnect is a centralized platform to automate and manage campus events efficiently. It allows:

- **Organizers** to publish events- **Organizers** to publish events

- **Students** to register and receive updates- **Students** to register and receive updates

- **Administrators** to oversee event operations- **Administrators** to oversee event operations



## 🎯 Software Construction Concepts Demonstrated## 🏗️ Project Structure



This project implements key concepts from MIT 6.102 (Software Construction):```

src/

1. **Specifications** - MIT 6.102 style documentation with:├── main/java/com/campusconnect/

   - `@param` with preconditions (requires clauses)│   ├── model/                    # Domain models (ADTs)

   - `@returns` with postconditions│   │   ├── Role.java             # User role enum

   - `@throws` for anticipated failures│   │   ├── EventStatus.java      # Event status enum

   - `effects:` for mutations│   │   ├── User.java             # Abstract base user class

│   │   ├── Student.java          # Student user type

2. **Abstract Data Types (ADTs)** - Immutable data types with:│   │   ├── Organizer.java        # Organizer user type

   - Abstraction Functions (AF)│   │   ├── Admin.java            # Admin user type

   - Representation Invariants (RI)│   │   └── Event.java            # Event domain class

   - Safety from Rep Exposure│   │

│   ├── service/                  # Business logic services

3. **Recursive Data Types** - AST nodes for parsing│   │   ├── RegistrationManager.java   # Event registration handling

│   │   ├── AuthService.java           # Authentication service

4. **Parsing** - Recursive descent parser for rule DSL:│   │   ├── NotificationService.java   # User notifications

   - Lexer (tokenization)│   │   ├── ReminderScheduler.java     # Automatic reminders

   - Parser (grammar rules)│   │   └── AdminManager.java          # Admin operations

   - Rule evaluation engine│   │

│   ├── parsing/                  # Little language & parsing

5. **Concurrency** - Async/await patterns with:│   │   ├── RuleLexer.java        # Tokenizer for rule language

   - Mutex/lock patterns│   │   ├── RuleParser.java       # Recursive descent parser

   - Race condition demonstrations│   │   ├── ASTNode.java          # Abstract Syntax Tree node

   - Thread-safe operations│   │   └── RuleEngine.java       # Rule evaluation engine

│   │

6. **Testing** - Test-first programming:│   ├── concurrency/              # Threading & race conditions

   - Tests written from specifications│   │   ├── ConcurrentRegistrationTask.java  # Runnable registration

   - Input space partitioning│   │   └── ConcurrencyDemo.java             # Race condition demo

   - Boundary cases│   │

│   ├── persistence/              # Data storage

## 🏗️ Project Structure│   │   └── FileStorageService.java  # File-based persistence

│   │

```│   └── util/                     # Utilities

src/│       ├── AssertionUtils.java   # Debugging assertions

├── types.ts                      # Core type definitions│       └── Logger.java           # Logging utility

├── index.ts                      # Barrel exports│

│└── test/java/com/campusconnect/  # JUnit tests

├── models/                       # Domain models (ADTs)    └── CampusConnectTest.java    # Test suite

│   ├── user.ts                   # User factory functions & operations```

│   └── event.ts                  # Event factory functions & operations

│## 🎓 Software Construction Concepts Demonstrated

├── services/                     # Business logic services

│   ├── registrationManager.ts    # Event registration handling### a) Design and Modeling

│   ├── authService.ts            # Authentication service- **Class diagrams**: User hierarchy with Student, Organizer, Admin

│   ├── notificationService.ts    # User notifications (recursion demo)- **ADT design**: Event and User as Abstract Data Types with clear abstraction functions

│   └── adminManager.ts           # Admin operations

│### b) Specifications (Preconditions/Postconditions)

├── parsing/                      # Little language & parsingFollowing MIT 6.102 specification style:

│   ├── types.ts                  # Token & AST types```java

│   ├── lexer.ts                  # Tokenizer for rule language/**

│   ├── parser.ts                 # Recursive descent parser * Registers a user for an event.

│   ├── ruleEngine.ts             # Rule evaluation engine * 

│   └── index.ts                  # Module exports * @param eventId the ID of the event, requires eventId != null and non-empty

│ * @param userId  the ID of the user, requires userId != null and non-empty

├── concurrency/                  # Async & race conditions * @throws IllegalStateException if event is full

│   └── index.ts                  # Mutex, locks, race demos * 

│ * effects: adds user to event's registered list or waitlist

├── persistence/                  # Data storage */

│   └── index.ts                  # JSON file persistencepublic synchronized void registerUser(String eventId, String userId)

│```

└── utils/                        # Utilities

    ├── assertions.ts             # Debugging assertions### c) Mutability (Risks and Contracts)

    ├── logger.ts                 # Logging utility- **Rep Invariants**: Each class has `checkRep()` method

    └── index.ts                  # Module exports- **Defensive copying**: Collections returned as copies

- **Immutability**: IDs are `final`, enums are immutable

tests/

├── models/                       # Model tests### d) Recursion

│   ├── user.test.ts- **NotificationService.sendRecursiveReminders()**: Recursive batch notifications

│   └── event.test.ts- **ASTNode**: Recursive data type for parse trees

├── services/                     # Service tests- **RuleParser**: Recursive descent parsing

│   └── registrationManager.test.ts

├── parsing/                      # Parser tests### e) Abstraction (ADT Design)

│   ├── lexer.test.ts- **Abstraction Function (AF)**: Documented in class comments

│   └── parser.test.ts- **Rep Invariant (RI)**: Documented and enforced via `checkRep()`

├── concurrency/                  # Concurrency tests- **Safety from Rep Exposure**: Private fields, defensive copies

│   └── concurrency.test.ts

└── persistence/                  # Persistence tests### f) Parsing (Little Language)

    └── persistence.test.tsRule language grammar:

``````

RULE      ::= REMIND | CANCEL

## 🔧 Technology StackREMIND    ::= 'REMIND' NUMBER 'MINUTES' 'BEFORE'

CANCEL    ::= 'CANCEL' 'IF' '<' NUMBER 'REGISTRATIONS'

- **Language**: TypeScript (strict mode)```

- **Runtime**: Node.jsExample rules:

- **Testing**: Jest- `REMIND 30 MINUTES BEFORE`

- **Type Safety**: Branded types, readonly modifiers- `CANCEL IF <5 REGISTRATIONS`



## 📦 Installation### g) Concurrency

- **RegistrationManager**: Synchronized methods for thread-safe registration

```bash- **ConcurrencyDemo**: Demonstrates race conditions and safe alternatives

# Clone the repository- **ConcurrentRegistrationTask**: Runnable for async registration

git clone https://github.com/your-repo/event-management-system.git

cd event-management-system### h) Little Languages

- Custom rule DSL for event automation

# Install dependencies- RuleEngine evaluates parsed rules against events

npm install

### i) Debugging

# Build the project- **AssertionUtils**: Runtime assertion helpers

npm run build- **Logger**: Timestamped logging for traceability

- **checkRep()**: Rep invariant verification

# Run tests

npm test### j) Code Review

```- Clear specifications for review

- Consistent coding style

## 🧪 Running Tests- Documented contracts



```bash### k) Static Checking and Testing

# Run all tests- Type-safe Java code

npm test- JUnit test structure provided

- Partition-based test case design

# Run tests with coverage

npm run test:coverage## 🚀 Getting Started



# Run specific test file### Prerequisites

npm test -- tests/models/user.test.ts- Java 11 or higher

```- JUnit 5 for testing



## 📝 Example Usage### Building

```bash

### Creating Users# Compile the project

javac -d out src/main/java/com/campusconnect/**/*.java

```typescript

import { createStudent, createOrganizer, createAdmin } from './src';# Run tests (requires JUnit 5 on classpath)

java -jar junit-platform-console-standalone.jar --class-path out --scan-classpath

const student = createStudent('u1', 'Alice', 'alice@campus.edu', 'hashedpw');```

const organizer = createOrganizer('o1', 'Bob', 'bob@campus.edu', 'hashedpw');

const admin = createAdmin('a1', 'Charlie', 'charlie@campus.edu', 'hashedpw');### Team Work Division

```

| Member | Focus Areas | Classes |

### Creating Events|--------|-------------|---------|

| Member 1 | Core Logic & ADTs | User, Event, RegistrationManager, Unit Tests |

```typescript| Member 2 | Parsing & Little Language | RuleLexer, RuleParser, ASTNode, RuleEngine |

import { createEvent, addUser, isFull } from './src';| Member 3 | Concurrency & Debugging | ConcurrentRegistrationTask, ConcurrencyDemo, Logger |



const event = createEvent(## 📝 Functional Requirements

    'e1',

    'Tech Talk: TypeScript Best Practices',- **FR1**: Users can register/login as Student, Organizer, or Admin

    'Learn about TypeScript patterns',- **FR2**: Organizers can create, update, delete events

    '2024-12-15T14:00:00Z',- **FR3**: Students can browse and register for events

    50,- **FR4**: Admins can verify events and manage roles

    'o1'- **FR5**: Automatic waitlisting when capacity is reached

);- **FR6**: Automatic notifications for event changes

- **FR7**: Reminder scheduling before events

console.log(isFull(event)); // false- **FR8**: Concurrent registration support

- **FR9**: Persistent data storage

const updatedEvent = addUser(event, 'u1' as UserId);- **FR10**: Import/export event data

```

## 📄 License

### Parsing Rules

This project is for educational purposes as part of a Software Construction course.

```typescript

import { tokenize, parseRule } from './src';## 👥 Contributors



// Rule DSL: "REMIND 30 MINUTES BEFORE"- Team Member 1 (Core Logic)

const tokens = tokenize('REMIND 30 MINUTES BEFORE');- Team Member 2 (Parsing)

const result = parseRule(tokens);- Team Member 3 (Concurrency)


if (result.success) {
    console.log(result.value); // { kind: 'REMIND', minutesBefore: 30 }
}
```

### Concurrency Example

```typescript
import { createMutex, withLock, demonstrateSafeConcurrency } from './src';

// Demonstrate safe concurrent operations
const result = await demonstrateSafeConcurrency(100);
console.log(`Expected: ${result.expected}, Actual: ${result.actual}`);
// Expected: 100, Actual: 100
```

## 🔍 MIT 6.102 Specification Style

All functions follow MIT 6.102 specification format:

```typescript
/**
 * Registers a student for an event.
 * 
 * @param event - the event to register for, requires: event !== undefined
 * @param student - the student to register, requires: student.role === 'STUDENT'
 * @returns RegistrationResult indicating REGISTERED, WAITLISTED, or FAILED
 * 
 * Postconditions:
 * - If event has capacity: student added to registeredUserIds
 * - If event is full: student added to waitlistUserIds
 * - If already registered/waitlisted: returns FAILED
 * 
 * effects: none (pure function returning new objects)
 */
export function registerStudent(event: Event, student: Student): RegistrationResult {
    // Implementation
}
```

## 🧮 Rule DSL Grammar

The parsing module implements a simple rule language:

```
RULE      ::= REMIND | CANCEL
REMIND    ::= 'REMIND' NUMBER 'MINUTES' 'BEFORE'
CANCEL    ::= 'CANCEL' 'IF' '<' NUMBER 'REGISTRATIONS'
NUMBER    ::= [0-9]+
```

Example rules:
- `REMIND 30 MINUTES BEFORE` - Send reminder 30 minutes before event
- `CANCEL IF < 5 REGISTRATIONS` - Cancel event if fewer than 5 registrations

## 🔒 Type Safety Features

### Branded Types
```typescript
type UserId = string & { readonly __brand: 'UserId' };
type EventId = string & { readonly __brand: 'EventId' };
```

### Readonly Modifiers
```typescript
interface Event {
    readonly eventId: EventId;
    readonly title: string;
    readonly registeredUserIds: readonly UserId[];
}
```

### Result Types (No Exceptions for Expected Failures)
```typescript
type ParseResult<T> = 
    | { readonly success: true; readonly value: T }
    | { readonly success: false; readonly error: string; readonly position: number };
```

## 📊 Project Status

- ✅ Core types and models
- ✅ Service layer with specifications
- ✅ Recursive descent parser
- ✅ Concurrency demos
- ✅ Persistence layer
- ✅ Test suite (test-first programming)
- ⬜ Implementation of all function bodies (specs only)

## 👥 Team

Software Construction Course Project - 5th Semester

## 📄 License

MIT License
