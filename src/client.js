let worker = new Worker('src/main.js')

let canvas = [];
let fonts = {};

worker.onmessage = (ev => {
    // LOADER
    if (ev.data == 'python.ready') {
        fetch ('/tests/game/test.py').then (body => body.text().then((text) => {
            worker.postMessage({
                'module': 'test',
                'src': text,
                '__name__': '__main__',
            })
        }))
    } 

    // STDOUT
    else if (ev.data.type == "print") console.log(ev.data.str)
    
    // PYGAME
    else if (ev.data.type == "create_canvas") {
        let cnv = document.createElement("canvas")

        cnv.setAttribute('width', ev.data.width)
        cnv.setAttribute('height', ev.data.height)
        
        document.body.appendChild(cnv)
        
        canvas.push(cnv)
    } else if (ev.data.type == "drawImg") {
        let cnv = canvas[ev.data.id]
        
        let image = new Image(ev.data.width, ev.data.height)
        image.src = ev.data.img
        
        image.onload = () => cnv.getContext('2d').drawImage(image, ev.data.x, ev.data.y, ev.data.width, ev.data.height)
    } else if (ev.data.type == "drawText") {
        let font_path = ev.data.font.path;
        let font_name = font_path.split('/').join('__slash__').split(' ').join('__space__').split('-').join('__minus__').split('.').join('__dot__')
        
        function draw () {
            let cnv = canvas[ev.data.id]

            let ctx = cnv.getContext('2d')

            ctx.font = `${ev.data.font.size}px ${font_name}`
            ctx.fillStyle = ev.data.color.front
            ctx.textAlign = "left"
            ctx.textBaseline = "hanging"
            ctx.fillText(ev.data.text, ev.data.x, ev.data.y)
        }

        if (fonts[font_path]) {
            draw()
        } else {
            let font = new FontFace(font_name, `url(${font_path})`);

            font.load().then ( (ev) => {
                document.fonts.add(font)
                fonts[font_path] = font;

                draw()
            } )
        }
    }
}) 