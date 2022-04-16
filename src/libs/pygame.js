
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
            console.log(args)
            let width = args[1].__getitem__(0);
            let height = args[1].__getitem__(1);
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

        blit (args) {
            let th = args[0];
            let object = args[1];
            let rect = args[2];

            let x = rect.__getitem__ ? rect.__getitem__("x") : rect.x
            let y = rect.__getitem__ ? rect.__getitem__("y") : rect.y
            let width = rect.__getitem__ ? rect.__getitem__("width") : rect.width
            let height = rect.__getitem__ ? rect.__getitem__("height") : rect.height

            let ctx = {
                x, y, width, height
            }

            if (object instanceof PygameImage) {
                ctx.img = object.img
                ctx.type = "drawImg"
                ctx.id = th.id;

                postMessage( ctx )
            }
        }
    }

    class PygameImage extends PYTHON.PythonNode {
        constructor (img, x, y, width=undefined, height=undefined) {
            super();
            this.img = img;
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }

        get_draw_ctx () {
            return this.width != undefined ? {
                img: this.img, x: this.x, y: this.y, width: this.width, height: this.height
            } : {
                img: this.img, x: this.x, y: this.y
            }
        }
        convert_alpha (args) {
            return args[0]
        }
    }

    class LoadImageFunction extends PYTHON.AbstractFunctionNode {
        constructor () {super();}

        __call__(args) {
            let path = args[1]
            
            var request = new XMLHttpRequest();
            request.responseType = 'arraybuffer';
            request.open('GET', path, false);  // `false` makes the request synchronous
            request.send(null);

            if (request.status === 200) {
                var arr = new Uint8Array(request.response);

                // String.fromCharCode returns a 'string' from the specified sequence of Unicode values
                var raw = String.fromCharCode.apply(null, arr);
                
                //btoa() creates a base-64 encoded ASCII string from a String object 
                var b64 = btoa(raw);
                
                let data = path.split('.');
                var dataType = data[data.length - 1];
                
                //ta-da your image data url!
                var dataURL = 'data:image/' + dataType + ';base64,' + b64;

                return new PygameImage(dataURL, 0, 0);
            }


            return undefined
        }
    }

    class ScaleObjectFunction extends PYTHON.AbstractFunctionNode {
        constructor () {super();}

        __call__ (args) {
            let obj = args[1]

            let w = args[2].__getitem__(0)
            let h = args[2].__getitem__(1)

            obj.width = w;
            obj.height = h;

            return obj;
        }
    }

    PYTHON.load_module('pygame', {
        'init': new InitFunction(),

        'display' : {
            'set_mode': new CreateDisplayFunction(),
        },

        'image': {
            'load': new LoadImageFunction (),
        },

        'transform': {
            'scale': new ScaleObjectFunction (),
        }
    })

})();
