
(function () {

    let canvas_idx = 0;

    class InitFunction extends PYTHON.AbstractFunctionNode {
        __call__ (args) {
            console.log('Hello from the PYGAME community !')
            console.log('Running on Beta of js-python-interpreter')
            return null;
        }
    }

    class CreateDisplayFunction extends PYTHON.AbstractFunctionNode {
        __call__ (args) {
            let width = args[0].__getitem__(0);
            let height = args[0].__getitem__(1);
            postMessage( { type: "create_canvas", width: width, height: height} )

            canvas_idx += 1

            return new PygameCanvas(width, height, canvas_idx - 1)
        }
    }

    class PygameCanvas extends PYTHON.PythonNode {
        constructor(width, height, id) {
            super();
            this.width = width;
            this.height = height;
            this.id = id;
        }
        __str__() {
            return `<PythonCanvas [id=${this.id} width=${this.width} height=${this.height}]>`
        }
    }

    class PygameImage extends PYTHON.PythonNode {
        constructor (src)
    }

    PYTHON.load_module('pygame', {
        'init': new InitFunction(),
        'display' : {
            'set_mode': new CreateDisplayFunction(),
        }
    })

})();
