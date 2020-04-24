let dns: jacdac.DeviceNameClient

function describe(dev: jacdac.Device) {
    let name = ""
    if (dev == jacdac.selfDevice())
        name = "<self>"
    else if (dns) {
        const bound = dns.remoteRequestedDevices.find(d => d.boundTo == dev)
        if (bound) name = "(" + bound.name + ")"
    }
    return `${dev.shortId} ${name}`
}

function describeRemote(dev: jacdac.RemoteRequestedDevice) {
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
    menu.show({
        title: "Function: " + fun,
        footer: "A = select, -> = identify",
        update: opts => {
            devs = jacdac.devices().filter(cond)
            opts.elements = devs.map(d => menu.item(describe(d), opts => {
                res = d
                menu.exit(opts)
            }, () => identify(d)))
        }
    })
    return res
}

function operateDNS(ourDNS: jacdac.Device) {
    dns = new jacdac.DeviceNameClient(ourDNS.deviceId)
    dns.scan()

    menu.show({
        title: "Bind function",
        update: opts => {
            opts.elements = dns.remoteRequestedDevices.map(r =>
                menu.item(describeRemote(r), () => {
                    const newD = selectDevice(r.name, d => r.isCandidate(d))
                    r.select(newD)
                }))
            opts.elements.push(menu.item("Clear all names", () => {
                dns.clearNames()
                resetAll() // and reset everyone, just in case
            }))
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
    menu.show({
        title: "JACDAC browser",
        update: opts => {
            devs = jacdac.devices()
            devs.sort((a, b) => a.shortId.compare(b.shortId))
            opts.elements = devs.map(d => menu.item(describe(d), () => deviceView(d)))
        }
    })
}

interface FnMap {
    [index: string]: () => void;
}

function mainMenu() {
    menu.show({
        title: "JACDAC tool",
        update: opts => {
            opts.elements = allDNSes().map(d => menu.item("DNS: " + describe(d), () => operateDNS(d)))
            opts.elements.push(menu.item("Device browser", deviceBrowser))
            opts.elements.push(menu.item("Reset all devices", resetAll))
        }
    })
}

function main() {
    jacdac.start()
    menu.wait(1000, "Scanning...")
    mainMenu()
}

appuf2.init({
    files: {
        "readme.txt": "Drop .UF2 files here with JACDAC firmware!",
        "jd-uf2.txt": "Auto-detect"
    },
    volumeLabel: "JACDAC UF2",
    writeHandler: buf => {
        control.dmesg("wr: " + buf.length)
    }
})

control.runInBackground(main)
