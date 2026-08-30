import { useState } from "react";
import "./styles.css";

function App() {
  const [activeTab, setActiveTab] = useState("Checkout");

  return (
    <div className="app">
      <header className="header">
        <h1>Inventory Management System</h1>
      </header>

      <nav className="navigation">
        <button
          className={activeTab === "Checkout" ? "active" : ""}
          onClick={() => setActiveTab("Checkout")}
        >
          Checkout
        </button>

        <button
          className={activeTab === "Catalogue" ? "active" : ""}
          onClick={() => setActiveTab("Catalogue")}
        >
          Catalogue
        </button>

        <button
          className={activeTab === "Inventory" ? "active" : ""}
          onClick={() => setActiveTab("Inventory")}
        >
          Inventory
        </button>
      </nav>

      <main className="main-content">
        <h2>{activeTab}</h2>

        <section className="content-card">
          <p>
            Welcome to the Inventory Management System.
          </p>

          <p>
            The {activeTab.toLowerCase()} section will be developed
            in the next stage of the project.
          </p>
        </section>
      </main>
    </div>
  );
}
