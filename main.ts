let dns: jacdac.DeviceNameClient

function describe(dev: jacdac.Device) {
    let name = ""
    if (dev == jacdac.selfDevice())
        name = "<self>"
    else {
        const bound = dns.remoteNamedDevices.find(d => d.boundTo == dev)
        if (bound) name = "(" + bound.name + ")"
    }
    return `${dev.shortId} ${name}`
}

function describeRemote(dev: jacdac.RemoteNamedDevice) {
    let bnd = dev.boundTo ? dev.boundTo.shortId : ""
    const n = dev.candidates.filter(c => c != dev.boundTo).length
    if (n) {
        if (bnd) bnd += "+" + n
        else bnd = "" + n
    }
    if (bnd) bnd = "(" + bnd + ")"
    return `${dev.name} ${bnd}`
}

function selectDevice(fun: string, cond: (dev: jacdac.Device) => boolean) {
    let res: jacdac.Device = undefined
    let devs: jacdac.Device[]
    const opts: ui.MenuOptions = {
        title: "Function: " + fun,
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
    const options = [
        "Clear all names",
        "Reset all devices",
        "Cancel"
    ]
    const opts: ui.MenuOptions = {
        title: "Bind function",
        footer: "A = select",
        elements: null,
        onA: idx => {
            const r = remotes[idx]
            if (r) {
                const newD = selectDevice(r.name, d => r.isCandidate(d))
                r.select(newD)
            } else {
                let opt = idx - remotes.length
                switch (opt) {
                    case 0:
                        dns.clearNames()
                    // and reset everyone, just in case
                    case 1: // fallthrough
                        jacdac.JDPacket.onlyHeader(jacdac.CMD_CTRL_RESET)
                            .sendAsMultiCommand(jd_class.CTRL)
                        break
                    case 2:
                        done = true
                        break
                }

            }
        },
    }
    function update() {
        remotes = dns.remoteNamedDevices
        opts.elements = remotes.map(describeRemote).concat(options)
    }
    update()
    ui.showMenu(opts)
    while (!done) {
        pause(100)
        update()
    }
    game.popScene()
}

function bindOneDNS() {
    let ourDNS: jacdac.Device = null
    while (ourDNS == null) {

        ui.wait(1000, "Scanning...")
        //control.dmesgPerfCounters()

        const dns = jacdac.devices().filter(hasDNS)
        if (dns.length == 0) {
            game.splash("No DNS services found")
        } else if (dns.length == 1) {
            ourDNS = dns[0]
        } else {
            ourDNS = selectDevice("DNS", hasDNS)
        }
    }

    dns = new jacdac.DeviceNameClient(ourDNS.deviceId)
    dns.scan()

    selectName()

    function hasDNS(d: jacdac.Device) {
        return d.hasService(jd_class.DEVICE_NAME_SERVICE)
    }
}

function main() {
    jacdac.start()

    while (true)
        bindOneDNS()
}

control.runInBackground(main)
