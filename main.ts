let dns: jacdac.DeviceNameClient

function describe(dev: jacdac.Device) {
    let name = ""
    if (dev == jacdac.selfDevice())
        name = "<self>"
    else if (dns) {
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

function identify(d: jacdac.Device) {
    if (!d) return
    if (d == jacdac.selfDevice())
        control.runInBackground(jacdac.onIdentifyRequest)
    else
        d.sendCtrlCommand(jacdac.CMD_CTRL_IDENTIFY)
}

function selectDevice(fun: string, cond: (dev: jacdac.Device) => boolean) {
    let res: jacdac.Device = undefined
    let devs: jacdac.Device[]
    ui.showMenu({
        title: "Function: " + fun,
        footer: "A = select, B = identify",
        elements: null,
        onA: (idx, opts) => {
            res = devs[idx] || null
            ui.exitMenu(opts)
        },
        onB: idx => identify(devs[idx]),
        update: opts => {
            devs = jacdac.devices().filter(cond)
            opts.elements = devs.map(describe).concat(["Cancel"])
        }
    })
    return res
}

function operateDNS(ourDNS: jacdac.Device) {
    dns = new jacdac.DeviceNameClient(ourDNS.deviceId)
    dns.scan()

    let remotes: jacdac.RemoteNamedDevice[]
    const options = [
        "Clear all names",
        "Cancel"
    ]

    ui.showMenu({
        title: "Bind function",
        footer: "A = select, B = back",
        elements: null,
        onA: (idx, opts) => {
            const r = remotes[idx]
            if (r) {
                const newD = selectDevice(r.name, d => r.isCandidate(d))
                r.select(newD)
            } else {
                let opt = idx - remotes.length
                switch (opt) {
                    case 0:
                        dns.clearNames()
                        resetAll() // and reset everyone, just in case
                        break
                    case 1:
                        ui.exitMenu(opts)
                        break
                }
            }
        },
        update: opts => {
            remotes = dns.remoteNamedDevices
            opts.elements = remotes.map(describeRemote).concat(options)
        }
    })
}

function allDNSes() {
    return jacdac.devices().filter(hasDNS)
    function hasDNS(d: jacdac.Device) {
        return d.hasService(jd_class.DEVICE_NAME_SERVICE)
    }
}

function resetAll() {
    jacdac.JDPacket.onlyHeader(jacdac.CMD_CTRL_RESET)
        .sendAsMultiCommand(jd_class.CTRL)
}

function deviceBrowser() {
    let devs: jacdac.Device[] = []
    ui.showMenu({
        title: "JACDAC browser",
        footer: "A = identify, B = back",
        elements: null,
        onA: (idx, opts) => {
            const d = devs[idx]
            if (d) identify(d)
            else ui.exitMenu(opts)
        },
        update: opts => {
            devs = jacdac.devices()
            devs.sort((a, b) => a.shortId.compare(b.shortId))
            opts.elements = devs.map(d => describe(d))
        }
    })
}

interface FnMap {
    [index: string]: () => void;
}

function mainMenu() {
    const staticOptions: FnMap = {
        "Device browser": deviceBrowser,
        "Reset all devices": resetAll,
    }

    let funs: (() => void)[] = []

    ui.showMenu({
        title: "JACDAC tool",
        footer: "A = select",
        elements: null,
        onA: idx => {
            const f = funs[idx]
            if (f) f()
        },
        update: opts => {
            funs = []
            let optionNames =
                allDNSes().map(d => {
                    funs.push(() => operateDNS(d))
                    return "DNS: " + describe(d)
                })
            optionNames = optionNames.concat(Object.keys(staticOptions).map(s => {
                funs.push(staticOptions[s])
                return s
            }))
            opts.elements = optionNames
        }
    })
}

function main() {
    jacdac.start()
    ui.wait(1000, "Scanning...")
    mainMenu()
}

control.runInBackground(main)
