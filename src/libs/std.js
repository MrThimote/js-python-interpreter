
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

    class LenFunction extends PYTHON.AbstractFunctionNode {
        __call__(args) {
            if (args[0].__len__) return args[0].__len__()

            return args[0].length
        }
    }

    class RangeFunction extends PYTHON.AbstractFunctionNode {
        *__call__ (args) {
            let start = args[0]
            let stop = args[1]
            let step = args.length > 2 ? args[2] : 1
            let can_continue = (x) => {
                return step < 0 ? x > stop : x < stop
            };

            if (step == 0) throw 'ERROR'

            let x = start;
            while (can_continue(x)) {
                yield x;
                x += step;
            }
        }
    }

    PYTHON.register_global ( {
        'str': new StrFunction(),
        'len': new LenFunction(),
        'print': new PrintFunction(),
        'range': new RangeFunction(),
    } )

    PYTHON.evaluate()

});