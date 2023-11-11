# Leaf Programming Language Syntaxes

## Introduction

`Leaf` is a programming language that is designed to be easy to learn and use. It is a `high-level language` that is compiled to `JavaScript` and then compiled to machine code. It is designed to be a general-purpose language, but it is also designed to be easy to use for `beginners`. It is designed to be easy to learn and use, but it is also designed to be powerful enough to be used for basic codes.

## Installation

### Deno

**Install Deno**
```sh
iwr https://deno.land/x/install/install.ps1 -useb | iex
```

**Install Leaf**
```sh
deno install -f -A -n leaf https://raw.githubusercontent.com/leaf-min/main/leaf.min.js
```

**set PATH in environment variables**
```sh
<your-deno-install-location>/.deno/bin
```

### Run a file
    
```sh
leaf <filename>
```

### Run in REPL mode
    
```sh
leaf --repl
```

## Syntax guide

### Comments

Comments are used to explain the code. They are not executed by the computer.
    
```py
# This is a comment
```

### Variables

Variables are used to store data. They can be used to store numbers, strings, and other data types. `Leaf` supports the following data types:

- `Number` - A number is a value that can be used to represent a quantity. It can be a whole number or a decimal number.
- `String` - A string is a sequence of characters. It can be used to represent text.
- `Boolean` - A boolean is a value that can be either `true` or `false`.
- `List` - A list is a collection of values. It can be used to store multiple values.

`Leaf` is a `dynamically typed language`, which means that the type of a variable is determined at runtime. This means that you do not need to specify the type of a variable when you declare it.

You can declare a variable using the `set` keyword. You can also declare a variable using the `always` keyword. The `always` keyword is used to declare a variable that is always the same value. The `to` keyword can also be used to assign a value to a variable. 

```py
# Declare a variable
set x to 10
set PI always = 3.14
set name = "Leaf"
```

**Changing variables**

```py
change x to 20
name = "Leaf Programming Language"
```

### Mathematical operations

`Leaf` supports the following mathematical operations:

- `+` - Addition
- `-` - Subtraction
- `*` - Multiplication
- `/` - Division
- `%` - Modulo

```py
# Examples
y = x + 10

z = (x plus 5) times 2 modulo 10
```

### Tasks

`Tasks` are used to perform a task. They can be used to perform a task repeatedly. They are like `functions` in other programming languages.

```py
# Define a task
task sayHello() print("Hello World")

# Call the task
sayHello()
```

A task can have parameters. Parameters are used to pass values to a task. They are like `arguments` in other programming languages.

```py
# Define a task with parameters
task sayHello(name, age) {
    print("Hello " + name + "!")
    print("You are " + age + " years old.")
}

# Call the task
sayHello("Leaf", 10)
```

### Conditions

`Conditions` are used to perform a task if a condition is true. Leaf supports various types of conditions.

```py
# If statement
if x > 10 print("x is greater than 10")
```
```py
# If-else statement
if x > 10
    print("x is greater than 10")
else
    print("x is less than or equal to 10")
```
```py
# If-else if-else statement
if x > 10
    print("x is greater than 10")
else if x < 10
    print("x is less than 10")
else
    print("x is equal to 10")
```
```py
# Multiline if statement
if name == "Leaf" {
    print("Hello Leaf!")
    print("How are you?")
}
```

You can also use `then` keyword optionally after the condition.

```ruby
if x > 10 then print("x is greater than 10")
```
```py
# sets name based on power condition
set name = if power > 10 then "Leaf" else "John"
```

### Loops

`Loops` are used to perform a task repeatedly. Leaf supports various types of loops.

- `for-from-to` - This loop is used to perform a task a certain number of times starting from a certain number and ending at a certain number.
- `for-from-to-by` - This loop is used to perform a task a certain number of times starting from a certain number and ending at a certain number with a certain step.
- `for-in` - This loop is used to perform a task for each item in a list.

```py
# for-from-to loop
for x from 1 to 10 print(x)
```
```py
# for-from-to-by loop
for x from 1 to 10 by 2 print(x)
```
```py
# for-in loop
for x in [1, 2, 3, 4, 5] print(x)

# for-in loop with range
for x in 1..10 print(x)
```

### Lists

`Lists` are used to store multiple values. They can be used to store numbers, strings, and other data types or even tasks or statements. They can be used to store multiple values of the same type or multiple values of different types.

```py
# Create a list
set numbers to [1, 2, 3, 4, 5]
set names to ["Leaf", "John", "Jane"]

# Create a list with a loop
# assign [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] to numbers
set numbers to for x from 1 to 10 (x)

# Create a list with a loop and range
# assign [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] to numbers
set numbers to for x in 1..10 (x)
```

`Note: Lists are 0-indexed, can be negative, and can be sliced.`
```py
# assign 1 to x
set x to numbers[0]

# assign 10 to x
set x to numbers[-1]

# assign [1, 2, 3, 4, 5] to sublist
set sublist to numbers[0..5]

# change 3 to 10
change numbers[2] to 10
numbers[2] = 10 # same as above
```