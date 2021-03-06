
console.log = (str)=>postMessage({ 'type': 'print', 'str': str })

PYTHON = (function () {

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
        constructor (expr, right) {
            super();

            this.expr = expr;
            this.right = right;
        }

        evaluate (context) {
            this.expr.set(context, this.right instanceof PythonNode ? this.right.evaluate(context) : this.right)
        }
    }

    /**
     * Represents a node that will get a value from the context
     */
    class AbstractGetNode extends PythonNode {

    }

    /**
     * GetNode
     * @param name the name of the variable to get
     */
    class GetNode extends AbstractGetNode {
        constructor (name) {
            super();
            this.name = name;
        }

        evaluate (context) {
            while ((typeof context[this.name] == "undefined") && context.__up__) {
                context = context.__up__
            }

            return context[this.name];
        }

        set (context, value) {
            context[this.name] = value;
        }
    }

    /**
     * GetAtNode <left>[<idx_expr>]
     * 
     * @param left left side of the equation
     * @param idx_expr the expression representing the id or the object used as key.
     */
    class GetAtNode extends AbstractGetNode {
        constructor (left, idx_expr) {
            super();
            this.left = left;
            this.idx_expr = idx_expr;
        }

        evaluate (context) {
            let left =    this.left instanceof PythonNode ?     this.left.evaluate(context) : this.left
            let idx = this.idx_expr instanceof PythonNode ? this.idx_expr.evaluate(context) : this.idx_expr
            
            if (left.__getitem__) return left.__getitem__(idx)
            return left[idx]
        }

        set (context, value) {
            let left =    this.left instanceof PythonNode ?     this.left.evaluate(context) : this.left
            let idx = this.idx_expr instanceof PythonNode ? this.idx_expr.evaluate(context) : this.idx_expr

            if (left.__setitem__) return left.__setitem__(idx, value)
            left[idx] = value;
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
            this.else = undefined;
        }

        evaluate (context) {
            let expr = this.expr instanceof PythonNode ? this.expr.evaluate(context) : this.expr
            if (!expr) return this.else ? this.else.evaluate(context) : undefined;

            for (let node of this.nodes) {
                if (node instanceof ReturnNode) return node;
                let value = node.evaluate(context);
                if (value instanceof ReturnNode) return value;
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
                    if (node instanceof ReturnNode) return node;
                    let value = node.evaluate(context);
                    if (value instanceof ReturnNode) return value;
                }
            }
        }
    }

    class ForNode extends PythonNode {
        constructor (name, expression, nodes) {
            super();
            this.name = name;
            this.expression = expression;
            this.nodes = nodes;
        }

        evaluate (context) {
            let expr = this.expression instanceof PythonNode ? this.expression.evaluate(context) : this.expression
            if (expr.__gen__) expr = expr.___gen__()

            for (let value of expr) {
                context[this.name] = value;

                for (let node of this.nodes) {
                    if (node instanceof ReturnNode) return node;
                    let value = node.evaluate(context);
                    if (value instanceof ReturnNode) return value;
                }
            }
        }
    }

    class AbstractFunctionNode extends PythonNode {
        __call__ (args) {}
        evaluate (context) { return this; }
    }

    class CallFunctionNode extends AbstractGetNode {
        constructor (expr, arg_expressions) {
            super();
            this.expr = expr;
            this.arg_expressions = arg_expressions;
        }

        evaluate( context ) {
            let func = this.expr instanceof PythonNode ? this.expr.evaluate( context ) : this.expr
            let parent = undefined
            if (this.expr instanceof GetAtNode && typeof this.expr.idx_expr == "string") {
                parent = this.expr.left instanceof PythonNode ? this.expr.left.evaluate(context) : this.expr.left;
            }

            let args = this.arg_expressions.map((expr) => expr instanceof PythonNode ? expr.evaluate(context) : expr)
            if (parent != undefined) args.splice(0, 0, parent)

            if (func.__call__) return func.__call__(args)
            return func(args)
        }
    }

    class LambdaFunction extends AbstractFunctionNode {
        constructor (names, expr) {
            super()
            this.names = names;
            this.expr = expr;
            this.upper_ctx = {}
            this.is_copy = false;
        }

        evaluate (context) {
            if (this.is_copy) return this;

            let copy = new LambdaFunction(this.names, this.expr)
            copy.upper_ctx = context
            copy.is_copy = true;
            return copy;
        }

        __call__(args) {
            let ctx = { '__up__': this.upper_ctx }

            for (let idx = 0; idx < Math.max(args.length, this.names.length); idx ++ ) {
                ctx[this.names[idx]] = args[idx]
            }

            return this.expr.evaluate(ctx)
        }
    }

    class DefFunction extends AbstractFunctionNode {
        constructor (name, variable_names, block) {
            super()
            this.name = name;
            this.variable_names = variable_names;
            this.block = block;
            this.is_copy = false;
            this.upper_ctx = {}
        }

        evaluate (context) {
            if (this.is_copy) return this;

            let copy = new DefFunction(this.name, this.variable_names, this.block)
            copy.is_copy = true;
            copy.upper_ctx = context

            context[this.name] = copy;
            return copy;
        }

        __call__ (args) {
            let ctx = { '__up__': this.upper_ctx }

            for (let idx = 0; idx < Math.max(args.length, this.variable_names.length); idx ++ ) {
                ctx[this.variable_names[idx]] = args[idx]
            }

            for (let expr of this.block) {
                let data = expr.evaluate( ctx )

                if (data instanceof ReturnNode) return data.evaluate(ctx)
                if (expr instanceof ReturnNode) return data;
            }

            return null;
        }
    }

    class ReturnNode extends PythonNode {
        constructor (right_expr) {
            super()
            this.right_expr = right_expr
        }

        evaluate (context) {
            return this.right_expr instanceof PythonNode ? this.right_expr.evaluate(context) : this.right_expr
        }
    }

    class BuildForArrayNode extends PythonNode {
        constructor (expression, name, iter_expr) {
            super();
            this.expression = expression
            this.name = name;
            this.iter_expr = iter_expr;
        }

        evaluate (context) {
            let iter_expr = this.iter_expr instanceof PythonNode ? this.iter_expr.evaluate(context) : this.iter_expr
            if (iter_expr.__gen__) iter_expr = iter_expr.___gen__()

            let array = []
            for (let iter of iter_expr) {
                context[this.name] = iter;
                array.push(this.expression instanceof PythonNode ? this.expression.evaluate(context) : this.expression)
            }

            let node = new ArrayNode(array);
            node.built = true;
            return node;
        }
    }

    class ArrayNode extends PythonNode{
        constructor (expressions) {
            super();
            this.expressions = expressions
            this.built = false;
        }

        evaluate (context) {
            if (this.built) return this;

            let arr = new ArrayNode(
                this.expressions.map( (expr) => expr instanceof PythonNode ? expr.evaluate(context) : expr )
            )
            arr.built = true;
            return arr
        }

        __getitem__ (idx) {
            return this.expressions[idx];
        }
        __setitem__ (idx, value) {
            this.expressions[idx] = value;
        } 

        __str__ () {
            return "[" + this.expressions.map ( (expr) => {
                if (typeof expr == "string") return '"' + expr + '"'
                if (expr.__str__) {
                    return expr.__str__();
                }

                return JSON.stringify(expr)
            } ).join(", ") + "]"
        }
        __len__ () { return this.expressions.length }
    }

    class DictNode extends PythonNode {
        constructor (dict) {
            super();
            this.dict = dict;
        }

        evaluate ( context ) { return this; }
        __getitem__ (idx) {return this.dict[idx];}
        __setitem__ (idx, value) {this.dict[idx] = value; return value;}
    }

    class BuildDictNode extends PythonNode {
        constructor (key_expr, val_expr) {
            super();
            this.key_expr = key_expr;
            this.val_expr = val_expr;
        }

        evaluate (context) {
            let dictionnary = {}
            for (let idx = 0; idx < this.key_expr.length; idx ++) {
                let key = this.key_expr[idx]
                let val = this.val_expr[idx]

                let rkey = key instanceof PythonNode ? key.evaluate(context) : key
                let rval = val instanceof PythonNode ? val.evaluate(context) : val

                dictionnary[rkey] = rval
            }

            return new DictNode(dictionnary)
        }
    }

    class ImportNode extends PythonNode {
        constructor (name) {
            super();
            this.name = name;
        }

        evaluate (context) {
            context[this.name] = modules[this.name]
        }
    }

    class NativeFunctionNode extends AbstractFunctionNode {
        constructor (func) {
            this.func = func
        }

        __call__(args) {
            return this.func(...args)
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

        "LEFT_SQUARED_BRACKET": "LEFT_SQUARED_BRACKET",
        "RIGHT_SQUARED_BRACKET": "RIGHT_SQUARED_BRACKET",

        "LEFT_PARENTHESIES": "LEFT_PARENTHESIES",
        "RIGHT_PARENTHESIES": "RIGHT_PARENTHESIES",

        "LEFT_CURLY_BRACKET": "LEFT_CURLY_BRACKET",
        "RIGHT_CURLY_BRACKET": "RIGHT_CURLY_BRACKET",

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
        "DOT": "DOT",
        "COMMA": "COMMA",

        "IF": "IF",
        "ELIF": "ELIF",
        "ELSE": "ELSE",
        "WHILE": "WHILE",
        "LAMBDA": "LAMBDA",
        "DEF": "DEF",
        "RETURN": "RETURN",
        "FOR": "FOR",
        "IMPORT": "IMPORT",
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
        [",", TOKENS.COMMA],
        [".", TOKENS.DOT],

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

        ["[", TOKENS.LEFT_SQUARED_BRACKET],
        ["]", TOKENS.RIGHT_SQUARED_BRACKET],

        ["(", TOKENS.LEFT_PARENTHESIES],
        [")", TOKENS.RIGHT_PARENTHESIES],

        ["{", TOKENS.LEFT_CURLY_BRACKET],
        ["}", TOKENS.RIGHT_CURLY_BRACKET],
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
                    while (this.next(1) == "\t"
                    || (this.next(1) == ' ' && this.next(2) == ' ' && this.next(3) == ' ' && this.next(4) == ' ')) {
                        tab_count += 1;
                        this.move(this.next(1) == "\t" ? 1 : 4);
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
            if (name == "elif") return TOKENS.ELIF
            if (name == "else") return TOKENS.ELSE
            if (name == "while") return TOKENS.WHILE
            if (name == "or") return TOKENS.OR
            if (name == "and") return TOKENS.AND
            if (name == "lambda") return TOKENS.LAMBDA
            if (name == "def") return TOKENS.DEF
            if (name == "return") return TOKENS.RETURN
            if (name == "for") return TOKENS.FOR
            if (name == "in") return TOKENS.IN
            if (name == "import") return TOKENS.IMPORT

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
            if (this.token.name == TOKENS.IF) {
                this.move(1);
                let expr = this.parse(cur_tab_count)
                let if_object = new IfNode( expr, this.parse_block('if', cur_tab_count) )
                let last_if = if_object;
                
                while (this.token.name == TOKENS.EOF 
                    && this.next(1)?.name == TOKENS.TAB 
                    && this.next(1)?.value == cur_tab_count
                    && this.next(2)?.name == TOKENS.ELIF) {
                    this.move(3)
                    let new_expr = this.parse(cur_tab_count)
                    let new_if = new IfNode(new_expr, this.parse_block('elif', cur_tab_count))

                    last_if.else = new_if
                    last_if = new_if
                }

                if (this.token.name == TOKENS.EOF 
                    && this.next(1)?.name == TOKENS.TAB 
                    && this.next(1)?.value == cur_tab_count
                    && this.next(2)?.name == TOKENS.ELSE) {
                    this.move(3)
                    last_if.else = new IfNode(true, this.parse_block('else', cur_tab_count))
                }

                return if_object;
            }
            if (this.token.name == TOKENS.WHILE) {
                this.move(1);
                let expr = this.parse()
                return new WhileNode( expr, this.parse_block('while', cur_tab_count) )
            }
            if (this.token.name == TOKENS.DEF) {
                this.move(1);
                if (this.token.name != TOKENS.NAME) throw 'Expected name after def keywork'

                let name = this.token.value;
                this.move(1)

                if (this.token.name != TOKENS.LEFT_PARENTHESIES) throw 'Expected left parenthesies after name in definition of function'
                this.move(1)

                let variable_names = []
                while (this.advanced && this.token.name == TOKENS.NAME) {
                    variable_names.push(this.token.value);
                    this.move(1)

                    if (this.token.name != TOKENS.COMMA && this.token.name != TOKENS.RIGHT_PARENTHESIES)
                        throw 'Expected comma or right parenthesies after name in variable names of function definition'
                    
                    if (this.token.name == TOKENS.COMMA) this.move(1);
                    if (this.token.name == TOKENS.RIGHT_PARENTHESIES) {
                        this.move(1);
                        break;
                    }
                }
                if (variable_names.length == 0 && this.token.name == TOKENS.RIGHT_PARENTHESIES)
                    this.move(1);

                let block = this.parse_block('def', cur_tab_count)

                return new DefFunction(name, variable_names, block);
            }
            if (this.token.name == TOKENS.RETURN) {
                this.move(1);
                return new ReturnNode(this.parse_expression(0))
            }
            if (this.token.name == TOKENS.FOR) {
                this.move(1);
                if (this.token.name != TOKENS.NAME) throw 'Expected name for variable name in for'
            
                let name = this.token.value;
                this.move(1)

                if (this.token.name != TOKENS.IN) throw 'Expected in for iterator in for expression'
                this.move(1)

                let expr = this.parse_expression(0)
                let block = this.parse_block('for', cur_tab_count)

                return new ForNode(name, expr, block)
            }

            if (this.token.name == TOKENS.IMPORT) {
                this.move(1)
                let name = this.token.value
                this.move(1)
                return new ImportNode(name)
            }

            if (this.token.name == TOKENS.NAME) {
                let idx = this.idx;
                let expr = this.extended_factor()

                if (this.token.name == TOKENS.SET) {
                    this.move(1)
                    return new SetNode( expr, this.parse_expression(0) )
                } else {
                    this.idx = idx - 1;
                    this.move(1);
                }
            }
            return this.parse_expression(0);
        }

        /**
         * Generate expression
         * @param {Number} state how far the expression state is
         * @returns a syntax tree
         */
        parse_expression (state=0) {
            if (state == EXPRESSION_STATES.length) return this.extended_factor();
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

            if (this.token.name == TOKENS.LEFT_PARENTHESIES) {
                this.move(1);

                let first_expr = this.parse_expression(0);

                if (this.token?.name == TOKENS.RIGHT_PARENTHESIES) {
                    this.move(1);
                    return first_expr;
                }

                let expressions = [first_expr]
                while (this.token?.name == TOKENS.COMMA) {
                    this.move(1);
                    expressions.push(this.parse_expression(0))
                }

                if (this.token?.name == TOKENS.RIGHT_PARENTHESIES) this.move(1)
                
                return new ArrayNode(expressions);
            }

            if (this.token.name == TOKENS.LEFT_SQUARED_BRACKET) {
                this.move(1)
                let expressions = [];

                while (this.advanced && this.token.name != TOKENS.RIGHT_SQUARED_BRACKET) {
                    expressions.push(this.parse_expression(0))
                    if (this.token.name == TOKENS.FOR) break;

                    if (this.token.name == TOKENS.COMMA)
                        this.move(1);
                }

                if (this.token.name == TOKENS.FOR) {
                    this.move(1);
                    if (this.token.name != TOKENS.NAME) throw 'expected name after for in array build'
                    let name = this.token.value;
                    this.move(1);
                    if (this.token.name != TOKENS.IN) throw 'expected in after for array build'
                    this.move(1)
                    let iter_expr = this.parse_expression(0)
                    if (this.token.name != TOKENS.RIGHT_SQUARED_BRACKET) throw 'expected right squared bracket after for expression in aray build'
                    this.move(1)

                    return new BuildForArrayNode(expressions[0], name, iter_expr);
                }

                this.move(1);

                return new ArrayNode(expressions)
            }
            if (this.token.name == TOKENS.LEFT_CURLY_BRACKET) {
                let key_expressions = [];
                let val_expressions = [];
                this.move(1);

                while (this.advanced && this.token.name != TOKENS.RIGHT_CURLY_BRACKET) {
                    let key_expr = this.parse_expression(0)
                    if (this.token.name != TOKENS.TWO_DOTS) throw 'expected two dots in dict build'
                    this.move(1)
                    
                    let val_expr = this.parse_expression(0)

                    key_expressions.push(key_expr)
                    val_expressions.push(val_expr)

                    if (this.token.name == TOKENS.COMMA) this.move(1)
                    else if (this.token.name != TOKENS.RIGHT_CURLY_BRACKET) throw 'Expected comma or right curly bracket in dict build'
                }

                this.move(1)

                return new BuildDictNode(key_expressions, val_expressions)
            }

            if (this.token.name == TOKENS.LAMBDA) {
                this.move(1)

                let variable_names = [];

                while (this.advanced && this.token.name == TOKENS.NAME) {
                    if (this.token.name != TOKENS.NAME) throw 'error on lambda creation expected name'
                    variable_names.push(this.token.value)
                    this.move(1);

                    if (this.token.name != TOKENS.COMMA) break;
                    else this.move(1);
                }

                if (this.token.name != TOKENS.TWO_DOTS) throw 'Expected two dots for lambda expression'
                this.move(1);

                return new LambdaFunction(variable_names, this.parse_expression(0));
            }
        }

        extended_factor () {
            let left = this.factor();

            while (this.advanced){ 
                if (this.token.name == TOKENS.LEFT_SQUARED_BRACKET) {
                    this.move(1);
                    let idx_expr = this.parse_expression(0);
                    
                    if (this.token.name != TOKENS.RIGHT_SQUARED_BRACKET) throw 'Expected a \']\' at the end of a <at> expression'

                    this.move(1)

                    left = new GetAtNode(left, idx_expr)
                } else if (this.token.name == TOKENS.DOT) {
                    this.move(1)
                    if (this.token.name != TOKENS.NAME) throw 'Expected name after dot'

                    let name = this.token.value
                    this.move(1)
                    left = new GetAtNode(left, name)
                } else if (this.token.name == TOKENS.LEFT_PARENTHESIES) {
                    this.move(1);
                    let expressions = [];

                    while (this.advanced && this.token.name != TOKENS.RIGHT_PARENTHESIES) {
                        expressions.push(this.parse_expression(0))
                        
                        if (this.token.name == TOKENS.COMMA)
                            this.move(1);
                    }

                    this.move(1);

                    left = new CallFunctionNode(left, expressions);
                } else {
                    break;
                }
            }

            return left;
        }
    }

    const GLOBAL_CONTEXT = {}
    function create_context () {
        return {
            '__up__': GLOBAL_CONTEXT
        }
    }

    const modules = {}
    function load_module (name, context) {
        modules[name] = context
    }

    function register_global (dict) {
        let keys = Object.keys ( dict );
        for (let key of keys) {
            let obj = dict[key]

            GLOBAL_CONTEXT[key] = obj;
        }
    }
    
    function evaluate ( string ) {
        console.log(string)
        let lexer = new PythonLexer(string)
        let tokens = lexer.build()
    
        let parser = new PythonParser(tokens)
        let nodes = parser.build();
        console.log(nodes)
        let context = { '__up__': GLOBAL_CONTEXT }
        for (let node of nodes) {
            console.log(context)
            console.log(node)
            node.evaluate(context)
        }
        return context;
    }
    

    return {
        AbstractFunctionNode,
        AbstractGetNode,
        PythonNode,

        ArrayNode,
        DictNode,

        register_global,
        evaluate,
        load_module,
        modules
    }
})()


const LIBRARIES = [
    '/src/libs/std.js',
    '/src/libs/pygame.js'
];

LIBRARIES.forEach((src) => {
    importScripts(src)
})

postMessage('python.ready')

onmessage = (event)=>{
    let data = event.data

    if (event.data.__name__ == "__main__") {
        let ctx = PYTHON.evaluate(data.src)
        PYTHON.load_module(data.name, ctx)
    }
}
