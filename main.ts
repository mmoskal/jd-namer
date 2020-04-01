let dns: jacdac.DeviceNameClient

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

function describeRemote(dev: jacdac.RemoteNamedDevice) {
    const bnd = dev.boundTo ? dev.boundTo.shortId : "----"
    return `${bnd} ${dev.candidates.length} ${dev.name}`
}

function selectDevice(cond: (dev: jacdac.Device) => boolean) {
    let res: jacdac.Device = undefined
    let devs: jacdac.Device[]
    const opts: ui.MenuOptions = {
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
            ui.blinkMenuSelector(opts)
        }
    }
    update()
    ui.showMenu(opts)
    while (res === undefined) {
        pause(100)
        update()
    }
    game.popScene()
    return res
}

function selectName() {
    let remotes: jacdac.RemoteNamedDevice[]
    let done = false
    const opts: ui.MenuOptions = {
        title: "Select required name",
        footer: "A = select",
        elements: null,
        onA: idx => {
            const r = remotes[idx]
            if (r) {
                const newD = selectDevice(d => r.isCandidate(d))
                r.select(newD)
            }
        },
    }
    function update() {
        remotes = dns.remoteNamedDevices
        opts.elements = remotes.map(describeRemote).concat(["Cancel"])
    }
    update()
    ui.showMenu(opts)
    while (!done) {
        pause(100)
        update()
    }
    game.popScene()
}

function main() {
    jacdac.start()
    let ourDNS: jacdac.Device = null
    while (ourDNS == null) {
        ui.wait(1000, "Scanning...")
        const dns = jacdac.devices().filter(hasDNS)
        if (dns.length == 0) {
            game.splash("No DNS services found")
        } else if (dns.length == 1) {
            ourDNS = dns[0]
        } else {
            ourDNS = selectDevice(hasDNS)
        }
    }

    dns = new jacdac.DeviceNameClient(ourDNS.deviceId)
    dns.scan()

    selectName()

    function hasDNS(d: jacdac.Device) {
        return d.hasService(jd_class.DEVICE_NAME_SERVICE)
    }
}

main()

