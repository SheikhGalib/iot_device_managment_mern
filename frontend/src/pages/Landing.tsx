import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Server, Cpu, Radio, Shield, Gauge, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  const features = [
    {
      icon: Server,
      title: "Edge Device Management",
      description: "Monitor and control your Raspberry Pi, Orange Pi, and other edge devices in real-time."
    },
    {
      icon: Radio,
      title: "IoT Device Control",
      description: "Manage ESP32, Arduino, and custom IoT devices with customizable dashboards."
    },
    {
      icon: Cpu,
      title: "Resource Monitoring",
      description: "Track CPU, RAM, temperature, and other vital metrics across all your devices."
    },
    {
      icon: Zap,
      title: "Code Deployment",
      description: "Deploy code and updates to multiple devices simultaneously with ease."
    },
    {
      icon: Gauge,
      title: "Real-time Analytics",
      description: "Visualize sensor data and device performance with interactive charts."
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security for your IoT infrastructure."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">IoT Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Manage Your IoT Devices From Anywhere
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            A powerful, unified platform to monitor, control, and deploy code to all your IoT and edge devices.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything You Need to Manage IoT at Scale
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <feature.icon className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="p-12 text-center bg-gradient-hero">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your IoT Infrastructure?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of teams using IoT Hub to streamline their device management.
          </p>
          <Link to="/signup">
            <Button size="lg" className="text-lg px-8">
              Get Started Now
            </Button>
          </Link>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 IoT Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
