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
    let bcount = 0;

    const tick = () => { }
    const move = (dx: number) => {
        tick()
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
        tick()

        cursor = 0
        offset = 0

        controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
            move(1)
        })
        controller.down.onEvent(ControllerButtonEvent.Repeated, function () {
            move(1)
        })

        controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
            move(-1)
        })
        controller.up.onEvent(ControllerButtonEvent.Repeated, function () {
            move(-1)
        })

        controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
            control.runInBackground(function () {
                opts.onA(cursor)
            })
        })

        controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
            if (opts.onB)
                control.runInBackground(function () {
                    opts.onB(cursor)
                })
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

namespace jacdac {
    export class RemoteNamedDevice {
        services: number[] = [];
        boundTo: Device;
        candidates: Device[];

        constructor(
            public name: string
        ) { }

        select(dev: Device) {
            this.boundTo = dev
        }
    }

    export class Device {
        services: Buffer
        lastSeen: number
        _name: string
        _shortId: string

        constructor(public deviceId: string) {
        }

        get name() {
            if (this._name === undefined)
                this._name = settings.readString("#blah" + this.deviceId) || null
            return this._name
        }

        get shortId() {
            return this.deviceId;
        }

        toString() {
            return this.shortId + (this.name ? ` (${this.name})` : ``)
        }

        hasService(service_class: number) {
            for (let i = 4; i < this.services.length; i += 4)
                if (this.services.getNumber(NumberFormat.UInt32LE, i) == service_class)
                    return true
            return false
        }

        sendCtrlCommand(cmd: number, payload: Buffer = null) {
        }

        static clearNameCache() {
        }
    }

}

function describe(dev: jacdac.Device) {
    return `${dev.shortId}`
}

function selectDevice(devs: jacdac.Device[]) {
    let res: jacdac.Device = undefined
    const opts: MenuOptions = {
        title: "Select device",
        footer: "A = select, B = identify",
        elements: devs.map(describe).concat(["Cancel"]),
        onA: idx => {
            res = devs[idx] || null
        },
    }
    opts.onB = idx => {
        const d = devs[idx]
        if (d) {
            d.sendCtrlCommand(0)
            opts.highlightColor = 6
            pause(100)
            opts.highlightColor = 5
        }
    }
    showMenu(opts)
    pauseUntil(() => res !== undefined)
    game.popScene()
    return res
}

let devs: jacdac.Device[] = []
for (let i = 0; i < 20; ++i) {
    devs.push(new jacdac.Device("dev" + i))
}
selectDevice(devs)





