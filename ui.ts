
namespace ui {
    export interface MenuOptions {
        title: string
        footer?: string
        elements: string[]
        onA: (idx: number, opts: MenuOptions) => void
        onB?: (idx: number, opts: MenuOptions) => void
        update?: (opts: MenuOptions) => void
        highlightColor?: number
        active?: boolean
    }

    export function exitMenu(opts: MenuOptions) {
        game.popScene()
        opts.active = false
    }

    export function showMenu(opts: MenuOptions) {
        let cursor = 0;
        let offset = 0;
        let blinkOut = 0;

        const move = (dx: number) => {
            let nc = cursor + dx
            if (nc < 0) nc = 0
            else if (nc >= opts.elements.length)
                nc = opts.elements.length - 1
            if (nc - offset < 2) offset = nc - 2
            if (nc - offset > 6) offset = nc - 6
            if (offset < 0) offset = 0
            cursor = nc
        }

        function showMenu() {
            cursor = 0
            offset = 0

            controller.down.onEvent(ControllerButtonEvent.Pressed, () => move(1))
            controller.down.onEvent(ControllerButtonEvent.Repeated, () => move(1))

            controller.up.onEvent(ControllerButtonEvent.Pressed, () => move(-1))
            controller.up.onEvent(ControllerButtonEvent.Repeated, () => move(-1))

            controller.A.onEvent(ControllerButtonEvent.Pressed, () => {
                blinkOut = control.millis() + 100
                control.runInBackground(() => opts.onA(cursor, opts))
            })
            controller.B.onEvent(ControllerButtonEvent.Pressed, () => {
                if (opts.onB) {
                    blinkOut = control.millis() + 100
                    control.runInBackground(() => opts.onB(cursor, opts))
                } else {
                    exitMenu(opts)
                }
            })

            game.onPaint(function () {
                // if elements changed, cursor could be off limits - move(0) will limit it
                if (cursor >= opts.elements.length) move(0)
                const x = 10
                screen.fillRect(0, 0, 160, 12, 12)
                screen.print(opts.title, x - 1, 2, 4, image.font8)
                let hl = opts.highlightColor || 5
                if (blinkOut) {
                    if (blinkOut < control.millis()) blinkOut = 0
                    else hl = 6
                }
                for (let i = 0; i < 9; ++i) {
                    let e = opts.elements[i + offset] || "";
                    let y = 15 + i * 11
                    if (i + offset == cursor) {
                        screen.fillRect(0, y - 2, 160, 11, hl)
                        screen.print(e, x, y, 15)
                    }
                    else
                        screen.print(e, x, y, 1)
                }
                if (opts.footer)
                    screen.print(opts.footer, x, 120 - 6, 4, image.font5)
            })

        }

        game.pushScene()
        opts.active = true
        if (opts.update) opts.update(opts)
        showMenu()

        let cnt = 0
        while (opts.active) {
            if (cnt++ > 20 && opts.update) {
                opts.update(opts)
                cnt = 0
            }
            pause(20)
        }
    }

    export function wait(ms: number, msg: string) {
        game.pushScene();
        const dialog = new game.SplashDialog(screen.width, 35);
        dialog.setText(msg);
        dialog.cursor = img`.`

        const s = sprites.create(dialog.image, -1);

        game.onUpdate(() => {
            dialog.update();
        })

        pause(ms)
        game.popScene()
    }
}
