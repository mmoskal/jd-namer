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


function deviceView(d: jacdac.Device) {
    const services: ServiceDesc[] = []
    for (let i = 4; i < d.services.length; i += 4) {
        const id = d.services.getNumber(NumberFormat.UInt32LE, i)
        let s = serviceDescs.find(s => s.classNum == id)
        if (!s)
            s = new ServiceDesc(id, "0x" + d.services.slice(i, 4).toHex(), () => { })
        services.push(s)
    }

    let num = 0

    ui.showMenu({
        title: "Device: " + d.shortId,
        footer: "A = test service, B = back",
        elements: services.map(s => s.name).concat(["Back"]),
        onA: (idx, opts) => {
            const s = services[idx]
            if (s) s.testFn(++num)
            else ui.exitMenu(opts)
        },
        update: opts => {
            if (!d.isConnected)
                ui.exitMenu(opts)
        }
    })
}

