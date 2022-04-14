
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
            let start = args.length <= 1 ? 0 : args[0]
            let stop = args.length <= 1 ? args[0] : args[1]
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

    class MapFunction extends PYTHON.AbstractFunctionNode {
        *__call__ (args) {
            let func = args[0]
            let iter = args[1]

            if (iter.__gen__) iter = iter.___gen__()

            let map_data = (x) => {
                if (func.__call__) return func.__call__ ( [x] )
                return func([ x ])
            }

            for (let data of iter) {
                yield map_data(data)
            }
        }
    }

    class ListFunction extends PYTHON.AbstractFunctionNode {
        __call__ (args) {
            let iter = args[0]

            if (iter.__gen__) iter = iter.___gen__()

            let array = []

            for (let data of iter) {
                array.push(data)
            }

            let node = new PYTHON.ArrayNode(array);
            node.built = true;
            return node;
        }
    }

    PYTHON.register_global ( {
        'str': new StrFunction(),
        'len': new LenFunction(),
        'print': new PrintFunction(),
        'range': new RangeFunction(),
        'map': new MapFunction(),
        'list': new ListFunction(),
    } )

    class RandintFunction extends PYTHON.AbstractFunctionNode {
        __call__ (args) {
            let start = Math.min(args[0], args[1])
            let stop = Math.max(args[0], args[1])

            let diff = stop - start + 1
            let value = Math.floor (Math.random() * diff) % diff

            return value + start
        }
    }

    PYTHON.load_module( 'random', {
        "randint": new RandintFunction(),
    } )

    PYTHON.evaluate()

});