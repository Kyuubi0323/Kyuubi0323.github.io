---
title: Device Tree 
date: 2025-07-21 10:20:52 +0700
tags: [linux]
---

<h3 id="introduction" style="font-weight: bold;">Introduction</h3>
Device Tree is a data structure and language for describing hardware in embedded systems, particularly in Linux-based platforms. Instead of hardcoding hardware information directly into the kernel or drivers, Device Tree provides a standardized way to describe the hardware components, their relationships, and configuration parameters. This approach makes the kernel more portable and allows the same kernel binary to work with different hardware configurations.

---

<h3 id="what-is-device-tree" style="font-weight: bold;">What is Device Tree?</h3>

Device Tree serves as a **hardware description language** that tells the operating system about the hardware components that cannot be automatically discovered (non-discoverable hardware). Think of it as a "map" that describes:

- **Hardware components**: CPUs, memory, peripherals, buses
- **Hardware relationships**: How components are connected
- **Hardware properties**: Addresses, interrupts, clocks, pins
- **Configuration parameters**: Operating modes, capabilities, constraints

**Key Benefits:**
- **Hardware abstraction**: Separates hardware description from kernel code
- **Portability**: Same kernel works with different hardware configurations  
- **Maintainability**: Hardware changes don't require kernel recompilation
- **Standardization**: Common format across different architectures

---

<h3 id="device-tree-structure" style="font-weight: bold;">Device Tree Structure</h3>

Device Tree uses a **hierarchical tree structure** similar to a filesystem, with nodes representing hardware components and properties describing their characteristics.

<h4 id="basic-syntax" style="font-weight: bold;">Basic Syntax</h4>

```dts
/dts-v1/;

/ {
    model = "Example Board";
    compatible = "vendor,example-board";
    #address-cells = <1>;
    #size-cells = <1>;

    memory@40000000 {
        device_type = "memory";
        reg = <0x40000000 0x20000000>; // 512MB at 0x40000000
    };

    cpus {
        #address-cells = <1>;
        #size-cells = <0>;
        
        cpu@0 {
            device_type = "cpu";
            compatible = "arm,cortex-a9";
            reg = <0>;
            clock-frequency = <800000000>; // 800MHz
        };
    };

    soc {
        compatible = "simple-bus";
        #address-cells = <1>;
        #size-cells = <1>;
        ranges;
        
        uart0: serial@44e09000 {
            compatible = "ti,am335x-uart", "ti,omap3-uart";
            reg = <0x44e09000 0x2000>;
            interrupts = <72>;
            status = "okay";
        };

        i2c0: i2c@44e0b000 {
            compatible = "ti,omap4-i2c";
            reg = <0x44e0b000 0x1000>;
            interrupts = <70>;
            #address-cells = <1>;
            #size-cells = <0>;
            
            eeprom@50 {
                compatible = "at,24c256";
                reg = <0x50>;
            };
        };
    };
};
```

---

<h3 id="key-concepts" style="font-weight: bold;">Key Concepts</h3>

<h4 id="nodes-and-properties" style="font-weight: bold;">Nodes and Properties</h4>

**Nodes** represent hardware components:
```dts
uart0: serial@44e09000 {
    // Properties go here
};
```

**Properties** describe node characteristics:
```dts
compatible = "ti,am335x-uart", "ti,omap3-uart";  // String list
reg = <0x44e09000 0x2000>;                       // Address/size
interrupts = <72>;                               // Interrupt number
status = "okay";                                 // Status string
clock-frequency = <800000000>;                   // Integer value
```

<h4 id="addressing" style="font-weight: bold;">Addressing</h4>

**#address-cells**: Number of cells needed for addresses
**#size-cells**: Number of cells needed for sizes
**reg**: Register address and size

```dts
soc {
    #address-cells = <1>;  // Address needs 1 cell (32-bit)
    #size-cells = <1>;     // Size needs 1 cell (32-bit)
    
    uart0: serial@44e09000 {
        reg = <0x44e09000 0x2000>;  // Address: 0x44e09000, Size: 0x2000
    };
};
```

<h4 id="references-and-phandles" style="font-weight: bold;">References and Phandles</h4>

**Phandles** allow nodes to reference other nodes:

```dts
/ {
    clocks {
        osc: oscillator {
            #clock-cells = <0>;
            compatible = "fixed-clock";
            clock-frequency = <24000000>;
        };
    };

    uart0: serial@44e09000 {
        compatible = "ti,am335x-uart";
        reg = <0x44e09000 0x2000>;
        clocks = <&osc>;        // Reference to oscillator
        clock-names = "fclk";
    };
};
```

---

<h3 id="common-properties" style="font-weight: bold;">Common Properties</h3>

<h4 id="standard-properties" style="font-weight: bold;">Standard Properties</h4>

```dts
node-name {
    compatible = "vendor,device-model";     // Device identification
    reg = <address size>;                   // Register address/size
    interrupts = <irq-number>;             // Interrupt configuration
    status = "okay" | "disabled";          // Enable/disable status
    
    // Clock properties
    clocks = <&clock-phandle>;
    clock-names = "functional-clock";
    
    // GPIO properties  
    gpios = <&gpio-controller pin flags>;
    gpio-names = "reset-gpio";
    
    // Power management
    power-domains = <&power-controller>;
    
    // DMA properties
    dmas = <&dma-controller channel>;
    dma-names = "tx", "rx";
};
```

<h4 id="bus-specific-properties" style="font-weight: bold;">Bus-Specific Properties</h4>

**I2C devices:**
```dts
i2c@address {
    #address-cells = <1>;
    #size-cells = <0>;
    
    sensor@1a {
        compatible = "st,lis3dh-accel";
        reg = <0x1a>;              // I2C slave address
    };
};
```

**SPI devices:**
```dts
spi@address {
    #address-cells = <1>;
    #size-cells = <0>;
    
    flash@0 {
        compatible = "jedec,spi-nor";
        reg = <0>;                 // Chip select
        spi-max-frequency = <25000000>;
    };
};
```

---

<h3 id="compilation-and-tools" style="font-weight: bold;">Compilation and Tools</h3>

<h4 id="device-tree-compiler" style="font-weight: bold;">Device Tree Compiler (dtc)</h4>

**Compile .dts to .dtb:**
```bash
# Using kernel build system
make ARCH=arm dtbs                    # Build all DTBs
make ARCH=arm my-board.dtb           # Build specific DTB

# Using dtc directly
dtc -I dts -O dtb -o output.dtb input.dts

# Decompile .dtb back to .dts
dtc -I dtb -O dts -o output.dts input.dtb
```

**Include and preprocessing:**
```dts
/dts-v1/;
#include <dt-bindings/gpio/gpio.h>
#include <dt-bindings/interrupt-controller/irq.h>
#include "am335x.dtsi"              // Include base SoC definition

/ {
    model = "Custom AM335x Board";
    
    gpio-leds {
        compatible = "gpio-leds";
        
        led0 {
            label = "status";
            gpios = <&gpio1 21 GPIO_ACTIVE_HIGH>;
            default-state = "off";
        };
    };
};
```

---

<h3 id="practical-examples" style="font-weight: bold;">Practical Examples</h3>

<h4 id="example-gpio-led" style="font-weight: bold;">Example 1: GPIO LED Configuration</h4>

```dts
/ {
    gpio-leds {
        compatible = "gpio-leds";
        pinctrl-names = "default";
        pinctrl-0 = <&led_pins>;
        
        led-heartbeat {
            label = "heartbeat";
            gpios = <&gpio1 21 GPIO_ACTIVE_HIGH>;
            linux,default-trigger = "heartbeat";
            default-state = "off";
        };
        
        led-status {
            label = "status";  
            gpios = <&gpio1 22 GPIO_ACTIVE_HIGH>;
            default-state = "on";
        };
    };
    
    gpio-keys {
        compatible = "gpio-keys";
        
        button-user {
            label = "User Button";
            gpios = <&gpio0 30 GPIO_ACTIVE_LOW>;
            linux,code = <KEY_ENTER>;
            debounce-interval = <50>;
        };
    };
};
```

<h4 id="example-i2c-sensors" style="font-weight: bold;">Example 2: I2C Sensor Configuration</h4>

```dts
&i2c1 {
    status = "okay";
    clock-frequency = <400000>;  // 400kHz
    
    /* Temperature sensor */
    tmp102@48 {
        compatible = "ti,tmp102";
        reg = <0x48>;
        interrupt-parent = <&gpio0>;
        interrupts = <7 IRQ_TYPE_LEVEL_LOW>;
    };
    
    /* Accelerometer */
    lis3dh@19 {
        compatible = "st,lis3dh-accel";
        reg = <0x19>;
        
        interrupt-parent = <&gpio1>;
        interrupts = <6 IRQ_TYPE_EDGE_RISING>;
        
        st,drdy-int-pin = <1>;
        st,click-single-x;
        st,click-single-y;  
        st,click-single-z;
    };
    
    /* EEPROM */
    eeprom@50 {
        compatible = "atmel,24c256";
        reg = <0x50>;
        pagesize = <64>;
    };
};
```

<h4 id="example-spi-devices" style="font-weight: bold;">Example 3: SPI Device Configuration</h4>

```dts
&spi0 {
    status = "okay";
    pinctrl-names = "default";
    pinctrl-0 = <&spi0_pins>;
    
    spidev@0 {
        compatible = "rohm,dh2228fv";
        reg = <0>;
        spi-max-frequency = <1000000>;
    };
    
    flash@1 {
        compatible = "jedec,spi-nor";
        reg = <1>;
        spi-max-frequency = <25000000>;
        
        partitions {
            compatible = "fixed-partitions";
            #address-cells = <1>;
            #size-cells = <1>;
            
            bootloader@0 {
                label = "bootloader";
                reg = <0x0 0x40000>;
                read-only;
            };
            
            kernel@40000 {
                label = "kernel";
                reg = <0x40000 0x300000>;
            };
            
            rootfs@340000 {
                label = "rootfs";
                reg = <0x340000 0xcc0000>;
            };
        };
    };
};
```

---

<h3 id="device-tree-overlays" style="font-weight: bold;">Device Tree Overlays</h3>

**Overlays** allow runtime modification of the device tree without rebuilding the entire DTB. Commonly used in systems like Raspberry Pi.

<h4 id="overlay-syntax" style="font-weight: bold;">Overlay Syntax</h4>

```dts
/dts-v1/;
/plugin/;

/ {
    compatible = "ti,am335x-bone-black";
    
    /* Fragment to enable I2C2 */
    fragment@0 {
        target = <&i2c2>;
        __overlay__ {
            status = "okay";
            clock-frequency = <100000>;
            
            tmp102@48 {
                compatible = "ti,tmp102";
                reg = <0x48>;
            };
        };
    };
    
    /* Fragment to add GPIO LEDs */
    fragment@1 {
        target-path = "/";
        __overlay__ {
            my-leds {
                compatible = "gpio-leds";
                
                led@0 {
                    label = "overlay-led";
                    gpios = <&gpio1 16 0>;
                    default-state = "off";
                };
            };
        };
    };
};
```

**Apply overlay at runtime:**
```bash
# Load overlay
echo "my-overlay.dtbo" > /sys/kernel/config/device-tree/overlays/my-overlay/path

# Unload overlay  
rmdir /sys/kernel/config/device-tree/overlays/my-overlay/
```

---

<h3 id="debugging-device-tree" style="font-weight: bold;">Debugging Device Tree</h3>

<h4 id="verification-tools" style="font-weight: bold;">Verification and Analysis Tools</h4>

**Check compiled device tree:**
```bash
# View current device tree in kernel
ls -la /sys/firmware/devicetree/base/
cat /sys/firmware/devicetree/base/model

# Compare device trees
scripts/dtc/dtx_diff arch/arm/boot/dts/am335x-boneblack.dts /proc/device-tree

# Validate device tree
dtc -I dts -O dtb -o /dev/null -W no-unit_address_vs_reg my-board.dts
```

**Debug kernel boot messages:**
```bash
# Boot with device tree debugging
dmesg | grep -i "device tree\|of:"

# Check for driver binding issues
dmesg | grep -i "bound\|match\|probe"
```

<h4 id="common-issues" style="font-weight: bold;">Common Issues and Solutions</h4>

**Issue 1: Device not detected**
```dts
// Problem: Missing or incorrect compatible string
sensor@48 {
    compatible = "wrong,sensor-name";  // Wrong!
    reg = <0x48>;
};

// Solution: Use correct compatible string
sensor@48 {
    compatible = "ti,tmp102";          // Correct!
    reg = <0x48>;
};
```

**Issue 2: Address/size cell mismatch**
```dts
// Problem: Inconsistent addressing
parent {
    #address-cells = <2>;    // Parent expects 2 cells
    #size-cells = <1>;
    
    child@100 {
        reg = <0x100 0x10>;  // Only 1 address cell! Wrong!
    };
};

// Solution: Match parent's addressing scheme
parent {
    #address-cells = <2>;
    #size-cells = <1>;
    
    child@100 {
        reg = <0x0 0x100 0x10>;  // 2 address cells, 1 size cell
    };
};
```

---

<h3 id="best-practices" style="font-weight: bold;">Best Practices</h3>

<h4 id="organization-tips" style="font-weight: bold;">Organization and Maintainability</h4>

**1. Use includes and modularity:**
```dts
// base-soc.dtsi - SoC-level definitions
// board-common.dtsi - Board family common features  
// specific-board.dts - Board-specific configuration

#include "am335x.dtsi"           // SoC base
#include "am335x-bone-common.dtsi"  // Board family
```

**2. Consistent naming:**
```dts
// Good naming convention
uart0: serial@44e09000 { };      // Label: uart0, node: serial@address
i2c0: i2c@44e0b000 { };         // Label: i2c0, node: i2c@address
gpio_keys: gpio-keys { };        // Label: gpio_keys, node: gpio-keys
```

**3. Status management:**
```dts
// Disable by default in SoC file
uart1: serial@44e09100 {
    compatible = "ti,am335x-uart";
    reg = <0x44e09100 0x2000>;
    status = "disabled";    // Default disabled
};

// Enable in board file
&uart1 {
    status = "okay";        // Enable for this board
    pinctrl-names = "default";
    pinctrl-0 = <&uart1_pins>;
};
```

---

<h3 id="integration-with-linux" style="font-weight: bold;">Integration with Linux</h3>

<h4 id="kernel-integration" style="font-weight: bold;">Kernel Driver Integration</h4>

**Driver matching process:**
1. **Kernel reads device tree** at boot
2. **Creates platform devices** from DT nodes  
3. **Matches drivers** using compatible strings
4. **Calls driver probe** function with device tree data

**Example driver integration:**
```c
// In driver code
static const struct of_device_id my_sensor_dt_ids[] = {
    { .compatible = "vendor,my-sensor-v1" },
    { .compatible = "vendor,my-sensor-v2" },
    { /* sentinel */ }
};
MODULE_DEVICE_TABLE(of, my_sensor_dt_ids);

static struct platform_driver my_sensor_driver = {
    .probe = my_sensor_probe,
    .remove = my_sensor_remove,
    .driver = {
        .name = "my-sensor",
        .of_match_table = my_sensor_dt_ids,
    },
};
```

**Reading device tree properties in driver:**
```c
static int my_sensor_probe(struct platform_device *pdev)
{
    struct device_node *np = pdev->dev.of_node;
    u32 frequency;
    const char *name;
    
    // Read integer property
    if (of_property_read_u32(np, "clock-frequency", &frequency))
        frequency = 1000000;  // Default value
    
    // Read string property
    if (of_property_read_string(np, "sensor-name", &name))
        name = "default-sensor";
    
    // Check boolean property
    bool is_active = of_property_read_bool(np, "active-low");
    
    return 0;
}
```

---

<h3 id="conclusion" style="font-weight: bold;">Conclusion</h3>

Device Tree is a powerful and essential technology for describing hardware in modern embedded Linux systems. Key takeaways:

- **Separates hardware description from kernel code**, improving portability and maintainability
- **Uses hierarchical tree structure** with nodes representing hardware components and properties describing their characteristics  
- **Provides standardized syntax** for describing addresses, interrupts, clocks, GPIOs, and other hardware resources
- **Supports overlays** for runtime hardware configuration changes
- **Integrates seamlessly with Linux kernel** driver model through compatible string matching

**Best practices for success:**
- Start with existing examples for similar hardware
- Use modular organization with includes
- Follow consistent naming conventions
- Validate syntax with dtc compiler
- Test thoroughly with actual hardware

Device Tree knowledge is essential for embedded Linux developers working with ARM, RISC-V, and other architectures. Understanding DT enables you to effectively describe hardware, debug hardware-related issues, and create portable, maintainable embedded systems.

---