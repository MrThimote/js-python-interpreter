
document.addEventListener('DOMContentLoaded', () => {

    class StrFunction extends PYTHON.AbstractFunctionNode {
        __call__(args) {
            if (args[0] instanceof String) return "\"" + args[0] + "\""
            if (args[0].__str__) return args[0].__str__()

            return String(args[0])
        }
    }

    class PrintFunction extends PYTHON.AbstractFunctionNode {
        constructor () {
            super();
            this.converter = new StrFunction()
        }
        __call__(args) {
            console.log( this.converter.__call__(args) )
        }
    }

    PYTHON.register_global ( {
        'str': new StrFunction(),
        'print': new PrintFunction()
    } )

    PYTHON.evaluate()

});