// frontend/lexer.ts
var KEYWORDS = {
  set: 3 /* Set */,
  to: 4 /* To */,
  always: 5 /* Always */,
  change: 6 /* Change */,
  and: 7 /* And */,
  or: 8 /* Or */,
  task: 9 /* Task */,
  if: 10 /* If */,
  then: 16 /* Then */,
  else: 11 /* Else */,
  for: 12 /* For */,
  from: 13 /* From */,
  in: 14 /* In */,
  by: 15 /* By */
};
var BINARY_OPERATORS = {
  plus: 17 /* BinaryOperator */,
  minus: 17 /* BinaryOperator */,
  times: 17 /* BinaryOperator */,
  divide: 17 /* BinaryOperator */,
  modulo: 17 /* BinaryOperator */
};
function token(value = "", type) {
  return { value, type };
}
function isalpha(src) {
  return src.toUpperCase() != src.toLowerCase();
}
function isskippable(str) {
  return str == " " || str == "	" || str == "\r" || str == "\n";
}
function isint(str) {
  const c = str.charCodeAt(0);
  const bounds = ["0".charCodeAt(0), "9".charCodeAt(0)];
  return c >= bounds[0] && c <= bounds[1];
}
function skipline(src) {
  while (src.length > 0 && src[0] != "\r" && src[0] != "\n") {
    src.shift();
  }
  src.shift();
}
function tokenize(sourceCode) {
  const tokens = new Array();
  const src = sourceCode.split("");
  while (src.length > 0) {
    if (src[0] == ".") {
      src.shift();
      if (src[0] == ".") {
        tokens.push(token("..", 21 /* DotDot */));
        src.shift();
      } else {
        throw "Invalid token: .";
      }
    } else if (src[0] == ",") {
      tokens.push(token(src.shift(), 20 /* Comma */));
    } else if (src[0] == "(") {
      tokens.push(token(src.shift(), 22 /* OpenParen */));
    } else if (src[0] == ")") {
      tokens.push(token(src.shift(), 23 /* CloseParen */));
    } else if (src[0] == "[") {
      tokens.push(token(src.shift(), 24 /* OpenBracket */));
    } else if (src[0] == "]") {
      tokens.push(token(src.shift(), 25 /* CloseBracket */));
    } else if (src[0] == "{") {
      tokens.push(token(src.shift(), 26 /* OpenBrace */));
    } else if (src[0] == "}") {
      tokens.push(token(src.shift(), 27 /* CloseBrace */));
    } else if (src[0] == "=" || src[0] == "<" || src[0] == ">" || src[0] == "!") {
      const op = src.shift();
      if (src.length > 1 && src[0] == "=") {
        tokens.push(token(op + src.shift(), 18 /* RelationalOperator */));
      } else if (op == "=") {
        tokens.push(token(op, 19 /* Equals */));
      } else if (op != "!") {
        tokens.push(token(op, 18 /* RelationalOperator */));
      } else {
        console.error("Invalid token: ", op);
        Deno.exit(1);
      }
    } else if (src[0] == "+" || src[0] == "-" || src[0] == "*" || src[0] == "/" || src[0] == "%") {
      tokens.push(token(src.shift(), 17 /* BinaryOperator */));
    } else if (src[0] == "#") {
      skipline(src);
    } else if (src[0] == '"') {
      src.shift();
      let str = "";
      while (src.length > 0 && src[0] != '"') {
        str += src.shift();
      }
      const closing = src.shift();
      if (closing != '"') {
        console.error("Invalid string literal: ", str, ' - Missing closing "');
        Deno.exit(1);
      }
      tokens.push(token(str, 2 /* String */));
    } else {
      if (isint(src[0])) {
        let num = "";
        let dots = 0;
        while (src.length > 0 && (isint(src[0]) || src[0] == ".")) {
          num += src.shift();
          if (src[0] == ".") {
            if (src.length > 1 && src[1] == ".") {
              break;
            }
            dots++;
          }
        }
        if (dots > 1) {
          console.error("Invalid number literal: ", num);
          Deno.exit(1);
        }
        tokens.push(token(num, 0 /* Number */));
      } else if (isalpha(src[0])) {
        let ident = "";
        while (src.length > 0 && isalpha(src[0])) {
          ident += src.shift();
        }
        const binary = BINARY_OPERATORS[ident];
        const reserved = KEYWORDS[ident];
        if (binary) {
          tokens.push(token(ident, binary));
        } else if (reserved) {
          tokens.push(token(ident, reserved));
        } else {
          tokens.push(token(ident, 1 /* Identifier */));
        }
      } else if (isskippable(src[0])) {
        src.shift();
      } else {
        console.error(
          "Unreconized character found in source: ",
          src[0].charCodeAt(0),
          src[0]
        );
        Deno.exit(1);
      }
    }
  }
  tokens.push(token("EndOfFile", 28 /* EOF */));
  return tokens;
}

// frontend/parser.ts
var Parser = class {
  tokens = [];
  /*
   * Determines if the parsing is complete and the END OF FILE Is reached.
   */
  not_eof() {
    return this.tokens[0].type != 28 /* EOF */;
  }
  /**
   * Returns the currently available token
   */
  at() {
    return this.tokens[0];
  }
  /**
   * Returns the previous token and then advances the tokens array to the next value.
   */
  eat() {
    const prev = this.tokens.shift();
    return prev;
  }
  /**
   * Returns the previous token and then advances the tokens array to the next value.
   *  Also checks the type of expected token and throws if the values dnot match.
   */
  expect(type, err) {
    const prev = this.tokens.shift();
    if (!prev || prev.type != type) {
      console.error("Parser Error:\n", err, prev, " - Expecting: ", type);
      Deno.exit(1);
    }
    return prev;
  }
  produceAST(sourceCode) {
    this.tokens = tokenize(sourceCode);
    const program = {
      kind: "Program",
      body: []
    };
    while (this.not_eof()) {
      program.body.push(this.parse_stmt());
    }
    return program;
  }
  // Handle complex statement types
  parse_stmt() {
    switch (this.at().type) {
      case 3 /* Set */:
        return this.parse_var_declaration();
      case 6 /* Change */:
        return this.parse_assignment_expr();
      case 9 /* Task */:
        return this.parse_task_declaration();
      case 10 /* If */:
        return this.parse_if_stmt();
      case 12 /* For */:
        return this.parse_for_stmt();
      case 13 /* From */:
        return this.parse_from_stmt();
      default:
        return this.parse_expr();
    }
  }
  // Handle for loop statements
  // for a from 0 to 10 { ... }
  parse_for_stmt() {
    this.eat();
    const identifier = this.expect(
      1 /* Identifier */,
      "Unexpected token found while parsing for loop. Expected identifier."
    );
    if (this.at().type == 13 /* From */) {
      this.expect(
        13 /* From */,
        "Unexpected token found while parsing for loop. Expected 'from' keyword."
      );
      const from = this.parse_additive_expr();
      this.expect(
        4 /* To */,
        "Unexpected token found while parsing for loop. Expected 'to' keyword."
      );
      const to = this.parse_additive_expr();
      let by = {
        kind: "NumericLiteral",
        value: 1
      };
      if (this.at().type == 15 /* By */) {
        this.eat();
        by = this.parse_additive_expr();
      }
      let body;
      if (this.at().type == 26 /* OpenBrace */) {
        body = this.parse_block();
      } else {
        body = [this.parse_stmt()];
      }
      return {
        kind: "ForFromStmt",
        identifier: {
          kind: "Identifier",
          symbol: identifier.value
        },
        from,
        to,
        body,
        by
      };
    } else if (this.at().type == 14 /* In */) {
      this.expect(
        14 /* In */,
        "Unexpected token found while parsing for loop. Expected 'in' keyword."
      );
      const rangeIterable = this.parse_range_expr();
      let body;
      if (this.at().type == 26 /* OpenBrace */) {
        body = this.parse_block();
      } else {
        body = [this.parse_stmt()];
      }
      return {
        kind: "ForInStmt",
        identifier: {
          kind: "Identifier",
          symbol: identifier.value
        },
        iterable: rangeIterable,
        body
      };
    }
    throw new Error(
      `Unexpected token found while parsing for loop. Expected 'from' or 'in' keyword.`
    );
  }
  // Handle from loop statements
  // from a to b { ... }
  parse_from_stmt() {
    this.eat();
    const from = this.parse_additive_expr();
    this.expect(
      4 /* To */,
      "Unexpected token found while parsing from loop. Expected 'to' keyword."
    );
    const to = this.parse_additive_expr();
    let by = {
      kind: "NumericLiteral",
      value: 1
    };
    if (this.at().type == 15 /* By */) {
      this.eat();
      by = this.parse_additive_expr();
    }
    let body;
    if (this.at().type == 26 /* OpenBrace */) {
      body = this.parse_block();
    } else {
      body = [this.parse_stmt()];
    }
    return {
      kind: "FromStmt",
      from,
      to,
      body,
      by
    };
  }
  // Handle If Statements
  // if a < b { ... }
  // if a < b { ... } else { ... }
  // if a < b { ... } else if b < c { ... }
  // if a < b { ... } else if b < c { ... } else { ... }
  parse_if_stmt() {
    this.eat();
    const condition = this.parse_expr();
    if (this.at().type == 16 /* Then */) {
      this.eat();
    }
    let thenBody;
    if (this.at().type == 26 /* OpenBrace */) {
      thenBody = this.parse_block();
    } else {
      thenBody = [this.parse_stmt()];
    }
    if (this.at().type == 11 /* Else */) {
      this.eat();
      if (this.at().type == 10 /* If */) {
        return {
          kind: "IfStmt",
          condition,
          thenBranch: thenBody,
          elseBranch: [this.parse_if_stmt()]
        };
      } else {
        if (this.at().type == 26 /* OpenBrace */) {
          return {
            kind: "IfStmt",
            condition,
            thenBranch: thenBody,
            elseBranch: this.parse_block()
          };
        } else {
          return {
            kind: "IfStmt",
            condition,
            thenBranch: thenBody,
            elseBranch: [this.parse_stmt()]
          };
        }
      }
    }
    return {
      kind: "IfStmt",
      condition,
      thenBranch: thenBody,
      elseBranch: []
    };
  }
  // Handle Block Statements
  // {
  //   ...
  // }
  parse_block() {
    this.expect(
      26 /* OpenBrace */,
      "Unexpected token found while parsing block. Expected opening brace."
    );
    const body = [];
    while (this.at().type != 28 /* EOF */ && this.at().type != 27 /* CloseBrace */) {
      body.push(this.parse_stmt());
    }
    this.expect(
      27 /* CloseBrace */,
      "Unexpected token found while parsing block. Expected closing brace."
    );
    return body;
  }
  // Handle Function Declarations
  // task name() { ... }
  // task name(a, b, c) { ... }
  parse_task_declaration() {
    this.eat();
    const name = this.expect(
      1 /* Identifier */,
      "Unexpected token found while parsing task declaration. Expected function name."
    ).value;
    const args = this.parse_args();
    const params = args.map((arg) => {
      if (arg.kind != "Identifier") {
        console.error(
          "Unexpected token found while parsing function declaration. Expected identifier in parameters."
        );
        Deno.exit(1);
      }
      return arg.symbol;
    });
    const body = this.parse_block();
    return {
      kind: "TaskDeclaration",
      name,
      params,
      body
    };
  }
  // Handle Variable Declarations
  // set PI to 3.14
  // set PI = 3.14
  // set PI always to 3.14
  // set PI always = 3.14
  parse_var_declaration() {
    this.eat();
    const variables = [];
    parse_variable.call(this);
    while (this.at().type == 20 /* Comma */) {
      this.eat();
      parse_variable.call(this);
    }
    return {
      kind: "VarDeclaration",
      variables
    };
    function parse_variable() {
      const identifier = this.expect(
        1 /* Identifier */,
        "Expected identifier name following 'comma' in variable declaration."
      );
      let value = void 0;
      const constant = this.at().type == 5 /* Always */;
      if (constant) {
        this.eat();
      }
      if (this.at().type == 4 /* To */ || this.at().type == 19 /* Equals */) {
        this.eat();
        value = this.parse_stmt();
      } else {
        throw new Error(
          `Unexpected token found following identifier name. Expected to or = operator.`
        );
      }
      if (constant && !value) {
        console.error("Expected expression or value following 'always'.");
        Deno.exit(1);
      }
      variables.push({
        identifier: {
          kind: "Identifier",
          symbol: identifier.value
        },
        constant,
        value
      });
    }
  }
  // Handle expressions
  parse_expr() {
    return this.parse_assignment_expr();
  }
  // Handle Assignment Expressions
  parse_assignment_expr() {
    if (this.at().type == 6 /* Change */) {
      this.eat();
    }
    const left = this.parse_list_call_expr();
    if (this.at().type == 4 /* To */ || this.at().type == 19 /* Equals */) {
      this.eat();
      const right = this.parse_stmt();
      return {
        kind: "AssignmentExpr",
        assignee: left,
        value: right
      };
    }
    return left;
  }
  // Handle List Expressions
  // [1, 2, 3]
  // [1, 2, 3, ...]
  // [1, g, f(), ...a]
  parse_list_expr() {
    if (this.at().type == 24 /* OpenBracket */) {
      this.eat();
      const values = this.parse_list_values();
      this.expect(
        25 /* CloseBracket */,
        "Unexpected token found while parsing list. Expected closing bracket."
      );
      return {
        kind: "ListExpr",
        values
      };
    }
    return this.parse_logical_expr();
  }
  // Handle List Literals
  // helper function for parsing list values
  parse_list_values() {
    const values = [];
    while (this.at().type != 25 /* CloseBracket */) {
      values.push(this.parse_stmt());
      if (this.at().type == 20 /* Comma */) {
        this.eat();
      }
    }
    return values;
  }
  // Handle Logical Expressions
  // a and b
  // a or b
  // a and b or c
  // a or b and c
  parse_logical_expr() {
    let left = this.parse_conditional_expr();
    while (this.at().value == "and" || this.at().value == "or") {
      const operator = this.eat().value;
      const right = this.parse_logical_expr();
      left = {
        kind: "LogicalExpr",
        left,
        right,
        operator
      };
    }
    return left;
  }
  // Handle Conditional Expressions
  // a < b
  // a + b < c * 4
  // a < b < c > d \\ a < b && b < c && c > d
  parse_conditional_expr() {
    let left = this.parse_additive_expr();
    if (this.at().type == 18 /* RelationalOperator */) {
      const operator = this.eat().value;
      let next = this.parse_additive_expr();
      left = {
        kind: "ConditionalExpr",
        left,
        right: next,
        operator
      };
      while (this.at().type == 18 /* RelationalOperator */) {
        const operator2 = this.eat().value;
        let right = this.parse_additive_expr();
        const savedRight = right;
        right = {
          kind: "ConditionalExpr",
          left: next,
          right,
          operator: operator2
        };
        left = {
          kind: "LogicalExpr",
          left,
          right,
          operator: "and"
        };
        next = savedRight;
      }
    }
    return left;
  }
  // Handle Addition & Subtraction Operations
  parse_additive_expr() {
    let left = this.parse_multiplicitave_expr();
    while (this.at().value == "plus" || this.at().value == "minus" || this.at().value == "+" || this.at().value == "-") {
      const operator = this.eat().value;
      const right = this.parse_expr();
      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator
      };
    }
    return left;
  }
  // Handle Multiplication, Division & Modulo Operations
  parse_multiplicitave_expr() {
    let left = this.parse_call_member_expr();
    while (this.at().value == "divide" || this.at().value == "times" || this.at().value == "modulo" || this.at().value == "/" || this.at().value == "*" || this.at().value == "%") {
      const operator = this.eat().value;
      const right = this.parse_call_member_expr();
      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator
      };
    }
    return left;
  }
  // Handle Call Expressions
  // a()
  // a(b)
  // a(b, c, ...)
  // member is `a` function
  parse_call_member_expr() {
    const member = this.parse_range_expr();
    if (this.at().type == 22 /* OpenParen */) {
      return this.parse_call_expr(member);
    }
    return member;
  }
  parse_list_call_expr() {
    let member = this.parse_list_expr();
    if (this.at().type == 24 /* OpenBracket */) {
      member = this.parse_list_index_expr(member);
    }
    return member;
  }
  parse_list_index_expr(caller) {
    this.expect(
      24 /* OpenBracket */,
      "Unexpected token found while parsing list index. Expected opening bracket."
    );
    const index = this.parse_expr();
    this.expect(
      25 /* CloseBracket */,
      "Unexpected token found while parsing list index. Expected closing bracket."
    );
    return {
      kind: "ListCallExpr",
      caller,
      index
    };
  }
  parse_call_expr(caller) {
    let callExpr = {
      kind: "CallExpr",
      caller,
      args: this.parse_args()
    };
    if (this.at().type == 22 /* OpenParen */) {
      callExpr = this.parse_call_expr(callExpr);
    }
    return callExpr;
  }
  parse_args() {
    this.expect(
      22 /* OpenParen */,
      "Unexpected token found while parsing arguments. Expected opening parenthesis."
    );
    const args = this.at().type == 23 /* CloseParen */ ? [] : this.parse_args_list();
    this.expect(
      23 /* CloseParen */,
      "Unexpected token found while parsing arguments. Expected closing parenthesis."
    );
    return args;
  }
  parse_args_list() {
    const args = [this.parse_assignment_expr()];
    while (this.at().type == 20 /* Comma */) {
      this.eat();
      args.push(this.parse_assignment_expr());
    }
    return args;
  }
  // Orders Of Prescidence
  // AdditiveExpr
  // MultiplicitaveExpr
  // RangeExpr
  // UnaryExpr
  // PrimaryExpr
  // Handle Range Expressions
  // 0..10
  parse_range_expr() {
    const from = this.parse_unary_expr();
    if (this.at().type == 21 /* DotDot */) {
      this.eat();
      const to = this.parse_unary_expr();
      return {
        kind: "RangeExpr",
        from,
        to
      };
    }
    return from;
  }
  parse_unary_expr() {
    if (this.at().value == "plus" || this.at().value == "minus" || this.at().value == "+" || this.at().value == "-") {
      const operator = this.eat().value;
      const value = this.parse_unary_expr();
      return {
        kind: "UnaryExpr",
        value,
        operator
      };
    }
    return this.parse_primary_expr();
  }
  // Parse Literal Values & Grouping Expressions
  parse_primary_expr() {
    const tk = this.at().type;
    switch (tk) {
      case 1 /* Identifier */:
        return { kind: "Identifier", symbol: this.eat().value };
      case 0 /* Number */:
        return {
          kind: "NumericLiteral",
          value: parseFloat(this.eat().value)
        };
      case 2 /* String */:
        return {
          kind: "StringLiteral",
          value: this.eat().value
        };
      case 22 /* OpenParen */: {
        this.eat();
        const value = this.parse_expr();
        this.expect(
          23 /* CloseParen */,
          "Unexpected token found inside parenthesised expression. Expected closing parenthesis."
        );
        return value;
      }
      default:
        console.error("Unexpected token found during parsing!", this.at());
        Deno.exit(1);
    }
  }
};

// runtime/values.ts
function MK_NULL() {
  return { type: "null", value: null };
}
function MK_NUMBER(value) {
  return { type: "number", value };
}
function MK_BOOL(b = true) {
  return { type: "boolean", value: b };
}
function MK_STRING(value) {
  return { type: "string", value };
}
function MK_LIST(values) {
  return { type: "list", values };
}
function MK_NATIVE_TASK(call) {
  return { type: "native-task", call };
}

// runtime/native.ts
var print = (args, _, io) => {
  const getOutput = (arg) => {
    if (arg.type == "null") {
      return "null";
    } else if (arg.type == "boolean") {
      return arg.value ? "true" : "false";
    } else if (arg.type == "number") {
      return arg.value.toString();
    } else if (arg.type == "string") {
      return arg.value;
    } else if (arg.type == "list") {
      const values = arg.values.map((val) => getOutput(val));
      return "[" + values.join(", ") + "]";
    } else if (Array.isArray(arg)) {
      const values = arg.map((val) => getOutput(val));
      return "[" + values.join(", ") + "]";
    } else {
      return "unknown argument type";
    }
  };
  const output = args.map((arg) => getOutput(arg)).join(" ");
  io.print(output);
  return MK_STRING(output);
};
var ask = (args, _, io) => {
  const message = args[0];
  if (message.type != "string") {
    throw new Error("Cannot ask for a non-string prompt.");
  }
  const input = io.readline(message.value);
  return MK_STRING(input || "");
};
var NativeTasks = {
  print,
  ask
};
var native_default = NativeTasks;

// runtime/environment.ts
var Environment = class {
  parent;
  variables;
  constants;
  constructor(parentENV) {
    this.parent = parentENV;
    this.variables = /* @__PURE__ */ new Map();
    this.constants = /* @__PURE__ */ new Set();
  }
  createGlobalEnv() {
    this.declareVar("null", MK_NULL(), true);
    this.declareVar("true", MK_BOOL(true), true);
    this.declareVar("false", MK_BOOL(false), true);
    this.declareVar("print", MK_NATIVE_TASK(native_default.print), true);
    this.declareVar("ask", MK_NATIVE_TASK(native_default.ask), true);
    return this;
  }
  declareVar(varname, value, constant) {
    if (this.variables.has(varname)) {
      throw `Cannot declare variable ${varname}. As it already is defined.`;
    }
    this.variables.set(varname, value);
    if (constant) {
      this.constants.add(varname);
    }
    return value;
  }
  assignVar(varname, value) {
    const env = this.resolve(varname);
    if (env.constants.has(varname)) {
      throw `Cannot assign to constant variable ${varname}.`;
    }
    env.variables.set(varname, value);
    return value;
  }
  lookupVar(varname) {
    const env = this.resolve(varname);
    return env.variables.get(varname);
  }
  resolve(varname) {
    if (this.variables.has(varname)) {
      return this;
    }
    if (this.parent == void 0) {
      throw `Cannot resolve '${varname}' as it does not exist.`;
    }
    return this.parent.resolve(varname);
  }
};

// runtime/eval/expressions.ts
function eval_numeric_binary_expr(lhs, rhs, operator) {
  let result;
  if (operator == "plus" || operator == "+") {
    result = lhs.value + rhs.value;
  } else if (operator == "minus" || operator == "-") {
    result = lhs.value - rhs.value;
  } else if (operator == "times" || operator == "*") {
    result = lhs.value * rhs.value;
  } else if (operator == "divide" || operator == "/") {
    if (rhs.value == 0)
      throw new Error(`Division by zero!`);
    result = lhs.value / rhs.value;
  } else {
    result = lhs.value % rhs.value;
  }
  return { value: result, type: "number" };
}
function eval_string_binary_expr(lhs, rhs, operator) {
  let result;
  if (operator == "plus" || operator == "+") {
    result = lhs.value + rhs.value;
  } else {
    throw new Error(`Invalid binary operator: ${operator}`);
  }
  return MK_STRING(result);
}
function eval_binary_expr(binop, env, io) {
  const lhs = evaluate(binop.left, env, io);
  const rhs = evaluate(binop.right, env, io);
  if (lhs.type == "number" && rhs.type == "number") {
    return eval_numeric_binary_expr(
      lhs,
      rhs,
      binop.operator
    );
  } else if (lhs.type == "string" && rhs.type == "string") {
    return eval_string_binary_expr(
      lhs,
      rhs,
      binop.operator
    );
  } else if (lhs.type == "list" && rhs.type == "list") {
    const left = lhs;
    const right = rhs;
    if (binop.operator == "plus" || binop.operator == "+") {
      return MK_LIST(left.values.concat(right.values));
    }
  } else if (lhs.type == "list" && rhs.type == "number") {
    const left = lhs;
    const right = rhs;
    if (binop.operator == "times" || binop.operator == "*") {
      const result = [];
      for (let i = 0; i < right.value; i++) {
        result.push(...left.values);
      }
      return MK_LIST(result);
    }
  } else if (lhs.type == "number" && rhs.type == "list") {
    const left = lhs;
    const right = rhs;
    if (binop.operator == "times" || binop.operator == "*") {
      const result = [];
      for (let i = 0; i < left.value; i++) {
        result.push(...right.values);
      }
      return MK_LIST(result);
    }
  } else if (lhs.type == "string" && rhs.type == "number") {
    const left = lhs;
    const right = rhs;
    if (binop.operator == "times" || binop.operator == "*") {
      let result = "";
      for (let i = 0; i < right.value; i++) {
        result += left.value;
      }
      return MK_STRING(result);
    }
  } else if (lhs.type == "number" && rhs.type == "string") {
    const left = lhs;
    const right = rhs;
    if (binop.operator == "times" || binop.operator == "*") {
      let result = "";
      for (let i = 0; i < left.value; i++) {
        result += right.value;
      }
      return MK_STRING(result);
    }
  }
  return MK_NULL();
}
function eval_unary_expr(unop, env, io) {
  if (unop.operator == "-" || unop.operator == "minus") {
    const operand = evaluate(unop.value, env, io);
    const result = operand.value * -1;
    return { value: result, type: "number" };
  } else if (unop.operator == "+" || unop.operator == "plus") {
    const operand = evaluate(unop.value, env, io);
    return { value: operand.value, type: "number" };
  }
  return MK_NULL();
}
function eval_identifier(ident, env) {
  const value = env.lookupVar(ident.symbol);
  return value;
}
function eval_list_expr(list, env, io) {
  const values = list.values.map((value) => evaluate(value, env, io));
  return MK_LIST(values);
}
function eval_list_call_expression(list, env, io) {
  const index = evaluate(list.index, env, io);
  if (index.type == "number") {
    const caller = evaluate(list.caller, env, io);
    let result = MK_NULL();
    const numberIndex = index;
    if (caller.type == "list") {
      const listCaller = caller;
      if (numberIndex.value < 0) {
        if (Math.abs(numberIndex.value) > listCaller.values.length)
          throw new Error(`Index out of bounds`);
        result = listCaller.values[listCaller.values.length + numberIndex.value];
      } else {
        if (numberIndex.value >= listCaller.values.length)
          throw new Error(`Index out of bounds`);
        result = listCaller.values[numberIndex.value];
      }
    } else if (caller.type == "string") {
      const stringCaller = caller;
      if (numberIndex.value < 0) {
        if (Math.abs(numberIndex.value) > stringCaller.value.length)
          throw new Error(`Index out of bounds`);
        result = MK_STRING(
          stringCaller.value[stringCaller.value.length + numberIndex.value]
        );
      } else {
        if (numberIndex.value >= stringCaller.value.length)
          throw new Error(`Index out of bounds`);
        result = MK_STRING(stringCaller.value[numberIndex.value]);
      }
    } else {
      throw new Error(`Invalid caller type: ${caller.type}`);
    }
    return result;
  } else if (index.type == "list") {
    const caller = evaluate(list.caller, env, io);
    const listIndex = index;
    const indices = listIndex.values.map((val) => {
      if (val.type != "number") {
        throw new Error(`Invalid index expression, expected number`);
      }
      return val.value;
    });
    const result = [];
    if (caller.type == "string") {
      const stringCaller = caller;
      for (const index2 of indices) {
        if (index2 < 0) {
          if (Math.abs(index2) > stringCaller.value.length)
            throw new Error(`Index out of bounds`);
          result.push(
            MK_STRING(stringCaller.value[stringCaller.value.length + index2])
          );
        } else {
          if (index2 >= stringCaller.value.length)
            throw new Error(`Index out of bounds`);
          result.push(MK_STRING(stringCaller.value[index2]));
        }
      }
      return MK_STRING(result.map((val) => val.value).join(""));
    } else if (caller.type == "list") {
      const listCaller = caller;
      for (const index2 of indices) {
        if (index2 < 0) {
          if (Math.abs(index2) > listCaller.values.length)
            throw new Error(`Index out of bounds`);
          result.push(listCaller.values[listCaller.values.length + index2]);
        } else {
          if (index2 >= listCaller.values.length)
            throw new Error(`Index out of bounds`);
          result.push(listCaller.values[index2]);
        }
      }
      return MK_LIST(result);
    } else {
      throw new Error(`Invalid caller type: ${caller.type}`);
    }
  }
  throw new Error(`Invalid index expression, expected number`);
}
function eval_assignment_expr(node, env, io) {
  if (node.assignee.kind == "Identifier") {
    const varname = node.assignee.symbol;
    return env.assignVar(varname, evaluate(node.value, env, io));
  } else if (node.assignee.kind == "ListCallExpr") {
    const listCall = node.assignee;
    const varname = listCall.caller.symbol;
    const index = evaluate(listCall.index, env, io);
    const caller = evaluate(listCall.caller, env, io);
    if (index.type != "number") {
      throw new Error(`Invalid index expression, expected number`);
    }
    if (index.value < 0) {
      if (Math.abs(index.value) > caller.values.length)
        throw new Error(`Index out of bounds`);
      caller.values[caller.values.length + index.value] = evaluate(
        node.value,
        env,
        io
      );
    } else {
      if (index.value >= caller.values.length)
        throw new Error(`Index out of bounds`);
      caller.values[index.value] = evaluate(node.value, env, io);
    }
    if (varname) {
      return env.assignVar(varname, caller);
    }
    return caller;
  }
  throw new Error(`Invalid LHS of expr: ${JSON.stringify(node.assignee)}`);
}
function eval_logical_expr(node, env, io) {
  const lhs = evaluate(node.left, env, io);
  if (lhs.type == "boolean") {
    let result;
    if (node.operator == "and") {
      const rhs = evaluate(node.right, env, io);
      result = lhs.value && rhs.value;
    } else if (node.operator == "or") {
      if (lhs.value)
        return MK_BOOL(true);
      const rhs = evaluate(node.right, env, io);
      result = rhs.value;
    } else {
      throw new Error(`Invalid logical operator: ${node.operator}`);
    }
    return MK_BOOL(result);
  }
  return MK_NULL();
}
function eval_conditional_expr(node, env, io) {
  const lhs = evaluate(node.left, env, io);
  const rhs = evaluate(node.right, env, io);
  if (lhs.type == "number" && rhs.type == "number") {
    let result;
    if (node.operator == "==") {
      result = lhs.value == rhs.value;
    } else if (node.operator == "!=") {
      result = lhs.value != rhs.value;
    } else if (node.operator == "<") {
      result = lhs.value < rhs.value;
    } else if (node.operator == ">") {
      result = lhs.value > rhs.value;
    } else if (node.operator == "<=") {
      result = lhs.value <= rhs.value;
    } else {
      result = lhs.value >= rhs.value;
    }
    return MK_BOOL(result);
  }
  return MK_NULL();
}
function eval_call_expr(node, env, io) {
  const args = node.args.map((arg) => evaluate(arg, env, io));
  const call = evaluate(node.caller, env, io);
  if (call.type == "task") {
    const task = call;
    const scope = new Environment(task.declarationEnv);
    if (args.length != task.params.length)
      throw new Error(
        `Invalid number of arguments to the task ${task.name}; Expected ${task.params.length}, got ${args.length}`
      );
    for (let i = 0; i < task.params.length; i++) {
      scope.declareVar(task.params[i], args[i], false);
    }
    let lastEvaluated = MK_NULL();
    for (const statement of task.body) {
      lastEvaluated = evaluate(statement, scope, io);
    }
    return lastEvaluated;
  } else if (call.type == "native-task") {
    const task = call;
    return task.call(args, env, io);
  }
  throw new Error(`Invalid call expression: ${JSON.stringify(node)}`);
}
function eval_range_expr(node, env, io) {
  const from = evaluate(node.from, env, io);
  const to = evaluate(node.to, env, io);
  if (from.type != "number" || to.type != "number") {
    throw new Error(`Invalid range expression, expected numbers`);
  }
  const result = [];
  if (from.value < to.value) {
    for (let i = from.value; i <= to.value; i++) {
      result.push(i);
    }
  } else {
    for (let i = from.value; i >= to.value; i--) {
      result.push(i);
    }
  }
  return MK_LIST(result.map((val) => ({ type: "number", value: val })));
}

// runtime/eval/statements.ts
function eval_program(program, env, io) {
  let lastEvaluated = MK_NULL();
  for (const statement of program.body) {
    lastEvaluated = evaluate(statement, env, io);
  }
  return lastEvaluated;
}
function eval_var_declaration(declaration, env, io) {
  let lastEvaluated = MK_NULL();
  for (const variable of declaration.variables) {
    lastEvaluated = env.declareVar(
      variable.identifier.symbol,
      evaluate(variable.value, env, io),
      variable.constant
    );
  }
  return lastEvaluated;
}
function eval_task_declaration(declaration, env) {
  const task = {
    type: "task",
    name: declaration.name,
    params: declaration.params,
    declarationEnv: env,
    body: declaration.body
  };
  return env.declareVar(declaration.name, task, true);
}
function eval_if_statement(statement, env, io) {
  const condition = evaluate(statement.condition, env, io);
  if (condition.type != "boolean") {
    console.error("Invalid condition for if statement");
    Deno.exit(1);
  }
  let lastEvaluated = MK_NULL();
  const scope = new Environment(env);
  if (condition.value) {
    for (const stmt of statement.thenBranch) {
      lastEvaluated = evaluate(stmt, scope, io);
    }
  } else {
    for (const stmt of statement.elseBranch) {
      lastEvaluated = evaluate(stmt, scope, io);
    }
  }
  return lastEvaluated;
}
function eval_for_from_statement(statement, env, io) {
  const from = evaluate(statement.from, env, io);
  const to = evaluate(statement.to, env, io);
  const by = evaluate(statement.by, env, io);
  if (from.type != "number" || to.type != "number") {
    console.error("Invalid from statement, expected numbers");
    Deno.exit(1);
  }
  const evaluations = [];
  const scope = new Environment(env);
  scope.declareVar(statement.identifier.symbol, MK_NULL(), false);
  if (from.value < to.value) {
    for (let i = from.value; i <= to.value; i += by.value) {
      scope.assignVar(statement.identifier.symbol, MK_NUMBER(i));
      for (const stmt of statement.body) {
        evaluations.push(evaluate(stmt, scope, io));
      }
    }
  } else {
    for (let i = from.value; i >= to.value; i -= by.value) {
      scope.assignVar(statement.identifier.symbol, MK_NUMBER(i));
      for (const stmt of statement.body) {
        evaluations.push(evaluate(stmt, scope, io));
      }
    }
  }
  return {
    type: "list",
    values: evaluations
  };
}
function eval_for_in_statement(statement, env, io) {
  const iterable = evaluate(statement.iterable, env, io);
  if (iterable.type != "list") {
    console.error("Invalid for-in statement, expected string");
    Deno.exit(1);
  }
  const evaluations = [];
  const scope = new Environment(env);
  scope.declareVar(statement.identifier.symbol, MK_NULL(), false);
  for (let i = 0; i < iterable.values.length; i++) {
    scope.assignVar(statement.identifier.symbol, iterable.values[i]);
    for (const stmt of statement.body) {
      evaluations.push(evaluate(stmt, scope, io));
    }
  }
  return {
    type: "list",
    values: evaluations
  };
}
function eval_from_statement(statement, env, io) {
  const from = evaluate(statement.from, env, io);
  const to = evaluate(statement.to, env, io);
  const by = evaluate(statement.by, env, io);
  if (from.type != "number" || to.type != "number" || by.type != "number") {
    console.error("Invalid from statement, expected numbers");
    Deno.exit(1);
  }
  const evaluations = [];
  const scope = new Environment(env);
  if (from.value < to.value) {
    for (let i = from.value; i <= to.value; i += by.value) {
      for (const stmt of statement.body) {
        evaluations.push(evaluate(stmt, scope, io));
      }
    }
  } else {
    for (let i = from.value; i >= to.value; i -= by.value) {
      for (const stmt of statement.body) {
        evaluations.push(evaluate(stmt, scope, io));
      }
    }
  }
  return {
    type: "list",
    values: evaluations
  };
}

// runtime/interpreter.ts
function evaluate(astNode, env, io) {
  switch (astNode.kind) {
    case "NumericLiteral":
      return MK_NUMBER(astNode.value);
    case "NullLiteral":
      return MK_NULL();
    case "StringLiteral":
      return MK_STRING(astNode.value);
    case "Identifier":
      return eval_identifier(astNode, env);
    case "ListExpr":
      return eval_list_expr(astNode, env, io);
    case "CallExpr":
      return eval_call_expr(astNode, env, io);
    case "ListCallExpr":
      return eval_list_call_expression(astNode, env, io);
    case "AssignmentExpr":
      return eval_assignment_expr(astNode, env, io);
    case "LogicalExpr":
      return eval_logical_expr(astNode, env, io);
    case "ConditionalExpr":
      return eval_conditional_expr(astNode, env, io);
    case "BinaryExpr":
      return eval_binary_expr(astNode, env, io);
    case "RangeExpr":
      return eval_range_expr(astNode, env, io);
    case "UnaryExpr":
      return eval_unary_expr(astNode, env, io);
    case "Program":
      return eval_program(astNode, env, io);
    case "VarDeclaration":
      return eval_var_declaration(astNode, env, io);
    case "TaskDeclaration":
      return eval_task_declaration(astNode, env);
    case "IfStmt":
      return eval_if_statement(astNode, env, io);
    case "ForFromStmt":
      return eval_for_from_statement(astNode, env, io);
    case "ForInStmt":
      return eval_for_in_statement(astNode, env, io);
    case "FromStmt":
      return eval_from_statement(astNode, env, io);
    default:
      console.error(
        "This AST Node has not yet been setup for interpretation.",
        astNode
      );
      Deno.exit(0);
  }
}

// runtime/io.ts
var IO = class {
  inputStream = [];
  outputStream = [];
  type = "terminal";
  constructor(type = "terminal") {
    this.type = type;
    this.inputStream = [];
    this.outputStream = [];
  }
  /**
   * Prints a string to the output stream.
   * @param output The string to print.
   */
  print(output) {
    if (this.type == "browser") {
      this.outputStream.push(output);
    } else {
      console.log(output);
    }
  }
  /**
   * Reads a line from the input stream.
   * @param prompt The prompt to display.
   */
  readline(prompt) {
    if (this.type == "browser") {
      return prompt;
    } else {
      return prompt;
    }
  }
  /**
   * Feeds input to the input stream.
   * @param input The input to feed.
   */
  feedInput(input) {
    if (this.type == "browser") {
      this.inputStream.push(input);
    } else {
      this.inputStream.push(input);
    }
  }
  /**
   * Gets the output stream.
   */
  getOutput() {
    return this.outputStream;
  }
};

// browser.ts
function run(source) {
  const parser = new Parser();
  const env = new Environment();
  const io = new IO("browser");
  env.createGlobalEnv();
  const program = parser.produceAST(source);
  evaluate(program, env, io);
  return io.getOutput();
}
export {
  run
};
