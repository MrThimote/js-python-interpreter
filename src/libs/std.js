
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
            console.log(args)
            console.log( this.converter.__call__(args) )
        }
    }

    class LenFunction extends PYTHON.AbstractFunctionNode {
        __call__(args) {
            if (args[0].__len__) return args[0].__len__()

            return args[0].length
        }
    }

    PYTHON.register_global ( {
        'str': new StrFunction(),
        'len': new LenFunction(),
        'print': new PrintFunction()
    } )

    PYTHON.evaluate()

});