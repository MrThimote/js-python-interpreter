
const PYTHON = (function () {

    /**
     * Token class
     * @param name the type of the token
     * @param value the value linked to the token
     */
    class Token {
        constructor (name, value) {
            this.name = name;
            this.value = value;
        }
    }

    /**
     * PythonNode, represents an abstract object on which operations can be done
     */
    class PythonNode {}

    /**
     * SetNode
     * @param name the name of the variable to change
     * @param right the expression that will get evaluated and will be changed
     */
    class SetNode extends PythonNode {
        constructor (name, right) {
            super();

            this.name = name;
            this.right = right;
        }

        evaluate (context) {
            context[this.name] = this.right instanceof PythonNode ? this.right.evaluate(context) : this.right
            return context[this.name]
        }
    }

    /**
     * GetNode
     * @param name the name of the variable to get
     */
    class GetNode extends PythonNode {
        constructor (name) {
            super();
            this.name = name;
        }

        evaluate (context) {
            return context[this.name];
        }
    }
    
    /**
     * IfNode
     * @param condition_expr the condition
     * @param nodes the block after the expression
     */
    class IfNode extends PythonNode {
        constructor (condition_expr, nodes) {
            super();
            this.expr = condition_expr
            this.nodes = nodes;
        }

        evaluate (context) {
            if (!this.expr.evaluate(context)) return false;

            for (let node of this.nodes) {
                node.evaluate(context)
            }
        }
    }

    /**
     * WhileNode
     * @param condition_expr the condition
     * @param nodes the block after the expression
     */
    class WhileNode extends PythonNode {
        constructor (condition_expr, nodes) {
            super();
            this.expr = condition_expr
            this.nodes = nodes;
        }

        evaluate (context) {
            while (this.expr.evaluate(context)) {
                for (let node of this.nodes) {
                    node.evaluate(context)
                }
            }
        }
    }

    /**
     * PythonOperation
     * @param operator operator type on which to apply the operation
     * @param left expression on which to apply the operator
     */
    class PythonOperation extends PythonNode {
        constructor (operator, left, right) {
            super();
            this.operator = operator;
            this.left = left;
            this.right = right;
        }

        evaluate (context) {
            let left = this.left instanceof PythonNode ? this.left.evaluate(context) : this.left
            // used to avoid glitches with numbers so that they get mapped in a node and to avoid a new class
            if (this.operator == TOKENS.SET) return left;
            
            let right = undefined;
            if (this.right)
                right = this.right instanceof PythonNode ? this.right.evaluate(context) : this.right

            if (this.operator == TOKENS.NOT)
                return left instanceof PythonNode ? left.__not__(right) : !left

            if (this.operator == TOKENS.PLUS)
                return left instanceof PythonNode ? left.__add__(right) : left + right
            if (this.operator == TOKENS.MINUS)
                return left instanceof PythonNode ? left.__sub__(right) : left - right
            
            if (this.operator == TOKENS.TIMES)
                return left instanceof PythonNode ? left.__mul__(right) : left * right
            if (this.operator == TOKENS.DIVIDE)
                return left instanceof PythonNode ? left.__truediv__(right) : left / right

            if (this.operator == TOKENS.POWER)
                return left instanceof PythonNode ? left.__pow__(right) : Math.pow(left, right)
            
            if (this.operator == TOKENS.LE)
                return left instanceof PythonNode ? left.__lt__(right) : left < right
            if (this.operator == TOKENS.LEE)
                return left instanceof PythonNode ? left.__le__(right) : left <= right
            
            if (this.operator == TOKENS.GT)
                return left instanceof PythonNode ? left.__gt__(right) : left > right
            if (this.operator == TOKENS.GTE)
                return left instanceof PythonNode ? left.__ge__(right) : left >= right
            
            if (this.operator == TOKENS.EQUALS)
                return left instanceof PythonNode ? left.__eq__(right) : left == right
            if (this.operator == TOKENS.NOT_EQUALS)
                return left instanceof PythonNode ? left.__ne__(right) : left != right
            
            if (this.operator == TOKENS.OR)
                return left instanceof PythonNode ? left.__or__(right) : left || right
            if (this.operator == TOKENS.AND)
                return left instanceof PythonNode ? left.__and__(right) : left && right

            if (this.operator == TOKENS.BIT_OR)
                return left instanceof PythonNode ? left.__bor__(right) : left || right
            if (this.operator == TOKENS.BIT_OR)
                return left instanceof PythonNode ? left.__bxor__(right) : left ^ right
            if (this.operator == TOKENS.BIT_AND)
                return left instanceof PythonNode ? left.__band__(right) : left && right
            
            if (this.operator == TOKENS.BIT_LEFT_SHIFT)
                return left instanceof PythonNode ? left.__bls__(right) : left << right
            if (this.operator == TOKENS.BIT_RIGHT_SHIFT)
                return left instanceof PythonNode ? left.__brs__(right) : left << right

            return ;
        }
    }

    /**
     * List of tokens
     */
    const TOKENS = {
        // long string
        "NAME": "NAME",
        "NUMBER": "NUMBER",
        "STRING": "STRING",
        "SET": "SET",

        // operators
        "PLUS": "PLUS",
        "MINUS": "MINUS",
        "TIMES": "TIMES",
        "DIVIDE": "DIVIDE",
        "MODULO": "MODULO",
        "POWER": "POWER",

        // boolean
        "OR": "OR",
        "AND": "AND",
        "NOT": "NOT",

        // comparison
        "IN": "IN",
        "NOT_IN": "NOT_IN",
        "IS": "IS",
        "IS_NOT": "IS_NOT",
        "LE": "LE",
        "LEE": "LEE",
        "GT": "GT",
        "GTE": "GTE",
        "EQUALS": "EQUALS",
        "NOT_EQUALS": "NOT_EQUALS",

        // bit operators
        "BIT_OR": "BIT_OR",
        "BIT_XOR": "BIT_XOR",
        "BIT_AND": "BIT_AND",

        "BIT_LEFT_SHIFT": "BIT_LEFT_SHIFT",
        "BIT_RIGHT_SHIFT": "BIT_RIGHT_SHIFT",

        // specials
        "EOF": "EOF",
        "TAB": "TAB",
        "TWO_DOTS": "TWO_DOTS",

        "IF": "IF",
        "WHILE": "WHILE"
    }

    /**
     * Operator tree,
     * if an operator is a prefix of another, it should be placed before and before another operator that doesn't start with the suffix:
     * 
     * For example
     * 
     * a
     * ab
     * c
     * 
     * is valid, but 
     * 
     * a
     * c
     * ab
     * 
     * isn't and ab will be skipped.
     */
    const OPERATOR_TREE = [
        ["=", TOKENS.SET],
        ["==", TOKENS.EQUALS],

        [":", TOKENS.TWO_DOTS],

        ["+", TOKENS.PLUS],
        ["-", TOKENS.MINUS],
        ["*", TOKENS.TIMES],
        ["**", TOKENS.POWER],
        ["/", TOKENS.DIVIDE],

        ["<", TOKENS.LE],
        ["<<", TOKENS.BIT_LEFT_SHIFT],
        ["<=", TOKENS.LEE],
        ["<>", TOKENS.NOT_EQUALS],

        [">", TOKENS.GT],
        [">=", TOKENS.GTE],
        [">>", TOKENS.BIT_RIGHT_SHIFT],
    ]
    
    class PythonLexer {
        constructor (string) {
            this.string = string;
            this.idx = 0;
            this.chr = '';
            this.advanced = false;
        }

        /**
         * Cursor operations
         */
        move (offset=1) {
            this.idx += offset
            this.advanced = 0 <= this.idx && this.idx < this.string.length
            this.chr = this.advanced ? this.string[this.idx] : undefined
            return this.chr
        }
        next (offset=1) {
            if (0 <= this.idx + offset < this.string.length)
                return this.string[this.idx + offset];
            return undefined;
        }

        /**
         * generate list of tokens
         */
        build () {
            if (this.tokens) return this.tokens

            this.idx = -1
            this.move(1)

            let tokens = [ new Token(TOKENS.TAB, 0) ]
            let last_idx = this.idx;

            while (this.advanced) {
                last_idx = this.idx;
                let offset = 1;

                let operator;
                let number;
                let name;
                let string;

                if (operator = this.findOperator()) {
                    tokens.push(new Token(operator, undefined))
                } else if (number = this.findNumber()) {
                    tokens.push(new Token(TOKENS.NUMBER, number))
                } else if (name = this.findName()) {
                    tokens.push(new Token(this.findNameToken(name), name))
                } else if (string = this.findString()) {
                    tokens.push(new Token(TOKENS.STRING, string))
                } else if (this.chr == "\n") {
                    tokens.push(new Token(TOKENS.EOF, undefined))

                    let tab_count = 0;
                    while (this.next(1) == "\t") {
                        tab_count += 1;
                        this.move(1);
                    }

                    tokens.push(new Token(TOKENS.TAB, tab_count))
                }

                this.move(offset)
                if (last_idx == this.idx) break;
            }
            tokens.push( new Token (TOKENS.EOF, undefined) )

            this.tokens = tokens;
            return this.tokens;
        }

        findOperator () {
            let sublength = 0;
            let operator = undefined;

            for (let idx = 0; idx < OPERATOR_TREE.length; idx ++) {
                if (OPERATOR_TREE[idx].length <= sublength) {
                    break;
                } else if (OPERATOR_TREE[idx][0].length == sublength + 1
                    && OPERATOR_TREE[idx][0][sublength] == this.chr) {
                    operator = OPERATOR_TREE[idx][1]
                    sublength += 1;

                    this.move(1);

                    if (!this.advanced) break;
                }
            }

            if (operator != undefined)
                this.move(-1)

            return operator;
        }

        findNumber () {
            let string = [];
            let can_point = true;

            while (this.advanced) {
                if ((can_point && this.chr == '.') 
                || "0123456789".includes(this.chr)) {
                    string.push(this.chr)
                    can_point = can_point && this.chr != '.'
                    this.move(1);
                } else break;
            }

            if (string.length != 0) this.move(-1)
            return string.length == 0 ? undefined : string.join("")
        }

        findName () {
            let string = [];
            
            while (this.advanced) {
                if (("0123456789".includes(this.chr) && string.length != 0)
                    || ("_abcdefghijklmnopqrstuvwxyz".includes(this.chr.toLowerCase()))) {
                    string.push(this.chr)
                    this.move(1);
                } else break;
            }

            if (string.length != 0) this.move(-1)
            return string.length == 0 ? undefined : string.join("")
        }

        findNameToken (name) {
            if (name == "if") return TOKENS.IF
            if (name == "while") return TOKENS.WHILE
            if (name == "or") return TOKENS.OR
            if (name == "and") return TOKENS.AND

            return TOKENS.NAME
        }

        findString () {
            if ("\"" != this.chr && "\'" != this.chr) return undefined;

            let first = this.chr;
            let string = ["\""];
            this.move(1);

            while (this.advanced) {
                if (this.chr == "\\") {
                    string.push(this.chr)
                    this.move(1);
                } else if (this.chr == first) {
                    break;
                } else if (this.chr == "\"") {
                    string.push("\\")
                }

                string.push(this.chr)
                this.move(1);
            }
            
            string.push("\"");
            return JSON.parse(string.join(""))
        }
    }

    /**
     * Expression execution order in python
     */
    const EXPRESSION_STATES = [
        [TOKENS.OR],
        [TOKENS.AND],
        [TOKENS.NOT],
        [
            TOKENS.IN, TOKENS.IS, TOKENS.NOT_IN, TOKENS.IS_NOT, 
            TOKENS.LE, TOKENS.LEE, TOKENS.GT, TOKENS.GTE, 
            TOKENS.NOT_EQUALS, TOKENS.EQUALS
        ],
        [TOKENS.BIT_OR],
        [TOKENS.BIT_XOR],
        [TOKENS.BIT_AND],
        [TOKENS.BIT_LEFT_SHIFT],
        [TOKENS.BIT_RIGHT_SHIFT],
        [TOKENS.PLUS, TOKENS.MINUS],
        [TOKENS.TIMES, TOKENS.DIVIDE, TOKENS.MODULO],
        [TOKENS.POWER],
    ]

    class PythonParser {
        constructor (tokens) {
            this.tokens = tokens;
            this.idx = -1;
            this.move(1);
        }

        /**
         * Cursor operations
         */
        move (offset=1) {
            this.idx += offset
            this.advanced = 0 <= this.idx && this.idx < this.tokens.length
            this.token = this.advanced ? this.tokens[this.idx] : undefined
            return this.token
        }
        next (offset=1) {
            if (0 <= this.idx + offset < this.tokens.length)
                return this.tokens[this.idx + offset];
            return undefined;
        }

        /**
         * generate a list of nodes until it reaches an operation that doesn't has expected_tab_count
         * @param {Number} expected_tab_count the number of \t before each expression
         */
        build (expected_tab_count=0) {
            let nodes = [];
            
            while (this.advanced) {
                if (this.token.name == TOKENS.TAB) {
                    let tab_count = this.token.value
                    this.move(1);

                    if (this.token.name == TOKENS.EOF) {
                        this.move(1);
                        continue;
                    }

                    if (tab_count != expected_tab_count) {
                        if (expected_tab_count < tab_count)
                            throw 'Bad number of indentations.'

                        this.move(-1)
                        break;
                    }
                }

                let expression = this.parse(expected_tab_count)
                nodes.push(expression)                

                if (this.token.name != TOKENS.EOF) {
                    throw 'Expected EOF at the end of expression';
                }
                this.move(1);
            }

            return nodes;
        }

        /**
         * Parse a block after the two dots.
         * 
         * cur_tab_count is the current expected_tab_count
         * type is the block type (if, while, ...)
         */
        parse_block (type, cur_tab_count) {
            if (this.token.name != TOKENS.TWO_DOTS) throw 'Expected ":" at the end of a '+ type

            this.move(2)
            let nodes = this.build(cur_tab_count + 1)
            this.move(-1)

            return nodes;
        }

        /**
         * generates an expression or a PythonNode
         * @param {Number} cur_tab_count current expected_tab_count
         */
        parse(cur_tab_count) {
            if (this.token.name == TOKENS.NAME && this.next(1).name == TOKENS.SET) {
                let name = this.token.value
                this.move(2);
                return new SetNode( name, this.parse_expression(0) )
            }
            if (this.token.name == TOKENS.IF) {
                this.move(1);
                let expr = this.parse()
                return new IfNode( expr, this.parse_block('if', cur_tab_count) )
            }
            if (this.token.name == TOKENS.WHILE) {
                this.move(1);
                let expr = this.parse()
                return new WhileNode( expr, this.parse_block('while', cur_tab_count) )
            }

            return this.parse_expression(0);
        }

        /**
         * Generate expression
         * @param {Number} state how far the expression state is
         * @returns a syntax tree
         */
        parse_expression (state=0) {
            if (state == EXPRESSION_STATES.length) return this.factor();
            // Unary state
            if (state == 2) {
                let operator = undefined;
                let search_state = state + 1;
                if (EXPRESSION_STATES[state].includes(this.token.name)) {
                    operator = this.token.name
                    this.move(1)
                    search_state = state;
                }

                let left = this.parse_expression(search_state)

                return operator == undefined ? left : new PythonOperation(operator, left, undefined)
            }

            let left = this.parse_expression(state + 1)

            while (EXPRESSION_STATES[state].includes(this.token.name)) {
                let operator = this.token.name;
                this.move(1)

                let right = this.parse_expression(state + 1)

                left = new PythonOperation(operator, left, right) 
            }

            return left;
        }

        /**
         * Simple factor object
         */
        factor () {
            if (this.token.name == TOKENS.NAME) {
                let value = this.token.value;
                this.move(1);
                return new GetNode(value);
            }

            if (this.token.name == TOKENS.NUMBER) {
                let value = Number(this.token.value)
                this.move(1)
                return new PythonOperation(TOKENS.SET, value);
            }
            if (this.token.name == TOKENS.STRING) {
                let value = this.token.value
                this.move(1)
                return new PythonOperation(TOKENS.SET, value);
            }
        }
    }
    
    let lexer = new PythonLexer(
` x = 1+1*2**3
  y = 1+1*x**4
  while y <= 6568 and y >= 6560:
\t    y = y + 1
  y = y + 1
  if y == 6570 or y == 6571:
\t    y = y + 2

  str = "this is a string"
  str = str + ". and you can add another one"`)
    let tokens = lexer.build()

    let parser = new PythonParser(tokens)
    let nodes = parser.build();
    
    let context = {}
    for (let node of nodes) {
        node.evaluate(context)
    }
    console.log(context)

    return {}
})()


