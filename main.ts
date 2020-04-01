interface MenuOptions {
    title: string
    footer?: string
    elements: string[]
    onA: (idx: number) => void
    onB?: (idx: number) => void
    highlightColor?: number
}

function showMenu(opts: MenuOptions) {
    let cursor = 0;
    let offset = 0;

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

        controller.A.onEvent(ControllerButtonEvent.Pressed, () =>
            control.runInBackground(() => opts.onA(cursor)))
        controller.B.onEvent(ControllerButtonEvent.Pressed, () => {
            if (opts.onB)
                control.runInBackground(() => opts.onB(cursor))
        })

        game.onPaint(function () {
            const x = 10
            screen.fillRect(0, 0, 160, 12, 12)
            screen.print(opts.title, x - 1, 2, 4, image.font8)
            for (let i = 0; i < 9; ++i) {
                let e = opts.elements[i + offset] || "";
                let y = 15 + i * 11
                if (i + offset == cursor) {
                    screen.fillRect(0, y - 2, 160, 11, opts.highlightColor || 5)
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
    showMenu()
}

const dns = new jacdac.DeviceNameClient()

function describe(dev: jacdac.Device) {
    let name = ""
    if (dev == jacdac.selfDevice())
        name = "<self>"
    else {
        const bound = dns.remoteNamedDevices.find(d => d.boundTo == dev)
        if (bound) name = bound.name
    }
    return `${dev.shortId} ${name}`
}

function wait(ms: number, msg: string) {
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

function selectDevice(cond: (dev: jacdac.Device) => boolean) {
    let res: jacdac.Device = undefined
    let devs: jacdac.Device[]
    const opts: MenuOptions = {
        title: "Select device",
        footer: "A = select, B = identify",
        elements: null,
        onA: idx => {
            res = devs[idx] || null
        },
    }
    function update() {
        devs = jacdac.devices().filter(cond)
        opts.elements = devs.map(describe).concat(["Cancel"])
    }
    opts.onB = idx => {
        const d = devs[idx]
        if (d) {
            if (d == jacdac.selfDevice())
                control.runInBackground(jacdac.onIdentifyRequest)
            else
                d.sendCtrlCommand(jacdac.CMD_CTRL_IDENTIFY)
            opts.highlightColor = 6
            pause(100)
            opts.highlightColor = 5
        }
    }
    update()
    showMenu(opts)
    while (res === undefined) {
        pause(100)
        update()
    }
    game.popScene()
    return res
}

jacdac.start()
wait(1000, "Scanning...")
selectDevice(d => true)
