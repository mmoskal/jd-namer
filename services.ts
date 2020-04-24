class ServiceDesc {
    constructor(
        public classNum: number,
        public name: string,
        public testFn: (num: number) => void
    ) { }
}

const serviceDescs = [
    new ServiceDesc(jd_class.ACCELEROMETER, "acc",
        num => jacdac.accelerometerClient.setStreaming(num & 1 ? true : false)),
    new ServiceDesc(jd_class.LIGHT, "light", (num) => {
        jacdac.monoLightClient.setBrightness(5)
        jacdac.lightClient.setAll(0x550055)
        pause(500)
        jacdac.lightClient.setAll(0x0)
        //jacdac.monoLightClient.setBrightness(0)
    }),
    new ServiceDesc(jd_class.SERVO, "servo", num =>
        (num & 3) == 0 ? jacdac.servoClient.turnOff() :
            jacdac.servoClient.setAngle(num & 1 ? 90 : 45)),
    new ServiceDesc(jd_class.PWM_LIGHT, "glo", num => {
        jacdac.monoLightClient.setBrightness(num & 1 ? 50 : 0)
        jacdac.monoLightClient.setIterations(1)
        jacdac.monoLightClient.showAnimation(jacdac.mono.slowGlow)
    }),
    new ServiceDesc(jd_class.ROTARY_ENCODER, "crank",
        num => jacdac.rotaryEncoderClient.setStreaming(num & 1 ? true : false)),
]

class RawSensorClient extends jacdac.SensorClient {
    constructor(name: string, deviceClass: number, requiredDevice: string) {
        super(name, deviceClass, requiredDevice)
    }
}

function sensorView(d: jacdac.Device, s: ServiceDesc) {
    const client = new RawSensorClient(s.name, s.classNum, d.deviceId)
    const reading = menu.item("Reading: ", () => { })
    client.setStreaming(true)
    client.onStateChanged(() => {
        reading.name = "Reading: " + jacdac.intOfBuffer(client.state)
    })

    menu.show({
        title: "Device: " + d.shortId + " / " + s.name,
        update: opts => {
            opts.elements = [reading]
            if (!d.isConnected)
                menu.exit(opts)
        }
    })

    client.destroy()
}

function hexNum(n: number) {
    const hex = "0123456789abcdef"
    let r = "0x"
    for (let i = 0; i < 8; ++i) {
        r += hex[(n >>> ((7 - i) * 4)) & 0xf]
    }
    return r
}

function deviceView(d: jacdac.Device) {
    if (d == jacdac.selfDevice())
        return
    const services: ServiceDesc[] = []
    for (let i = 4; i < d.services.length; i += 4) {
        const id = d.services.getNumber(NumberFormat.UInt32LE, i)
        let s = serviceDescs.find(s => s.classNum == id)
        if (!s)
            s = new ServiceDesc(id, "Service: " + hexNum(id), () => { })
        services.push(s)
    }

    let num = 0

    function noop() { }

    menu.show({
        title: "Device: " + d.shortId,
        footer: "A = select, -> = test service",
        update: opts => {
            opts.elements = []
            opts.elements.push(menu.item(d.classDescription, noop))
            opts.elements.push(menu.item("Temp: " + (d.temperature || "?") + "C", noop))
            opts.elements.push(menu.item("Light: " + (d.lightLevel || "?"), noop))
            opts.elements.push(menu.item("Identify", () => identify(d)))
            opts.elements = opts.elements.concat(services.map(s => menu.item(s.name, () => {
                sensorView(d, s)
            }, () => {
                s.testFn(++num)
            })))

            if (!d.isConnected)
                menu.exit(opts)
        }
    })
}

