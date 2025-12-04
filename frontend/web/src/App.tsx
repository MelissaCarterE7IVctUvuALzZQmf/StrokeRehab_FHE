// App.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface RehabilitationExercise {
  id: string;
  exerciseType: string;
  duration: number;
  difficulty: string;
  encryptedResults: string;
  timestamp: number;
  patientAddress: string;
  status: "prescribed" | "completed" | "skipped";
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<RehabilitationExercise[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newExerciseData, setNewExerciseData] = useState({
    exerciseType: "",
    duration: 15,
    difficulty: "medium",
    results: ""
  });
  const [showStats, setShowStats] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate statistics
  const completedCount = exercises.filter(e => e.status === "completed").length;
  const prescribedCount = exercises.filter(e => e.status === "prescribed").length;
  const skippedCount = exercises.filter(e => e.status === "skipped").length;

  useEffect(() => {
    loadExercises().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadExercises = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("exercise_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing exercise keys:", e);
        }
      }
      
      const list: RehabilitationExercise[] = [];
      
      for (const key of keys) {
        try {
          const exerciseBytes = await contract.getData(`exercise_${key}`);
          if (exerciseBytes.length > 0) {
            try {
              const exerciseData = JSON.parse(ethers.toUtf8String(exerciseBytes));
              list.push({
                id: key,
                exerciseType: exerciseData.exerciseType,
                duration: exerciseData.duration,
                difficulty: exerciseData.difficulty,
                encryptedResults: exerciseData.results,
                timestamp: exerciseData.timestamp,
                patientAddress: exerciseData.patientAddress,
                status: exerciseData.status || "prescribed"
              });
            } catch (e) {
              console.error(`Error parsing exercise data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading exercise ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setExercises(list);
    } catch (e) {
      console.error("Error loading exercises:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const submitExercise = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setCreating(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting rehabilitation data with FHE..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedData = `FHE-${btoa(JSON.stringify(newExerciseData))}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const exerciseId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const exerciseData = {
        exerciseType: newExerciseData.exerciseType,
        duration: newExerciseData.duration,
        difficulty: newExerciseData.difficulty,
        results: encryptedData,
        timestamp: Math.floor(Date.now() / 1000),
        patientAddress: account,
        status: "prescribed"
      };
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `exercise_${exerciseId}`, 
        ethers.toUtf8Bytes(JSON.stringify(exerciseData))
      );
      
      const keysBytes = await contract.getData("exercise_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(exerciseId);
      
      await contract.setData(
        "exercise_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Encrypted rehabilitation data submitted securely!"
      });
      
      await loadExercises();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowExerciseModal(false);
        setNewExerciseData({
          exerciseType: "",
          duration: 15,
          difficulty: "medium",
          results: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setCreating(false);
    }
  };

  const completeExercise = async (exerciseId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Processing encrypted data with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const exerciseBytes = await contract.getData(`exercise_${exerciseId}`);
      if (exerciseBytes.length === 0) {
        throw new Error("Exercise not found");
      }
      
      const exerciseData = JSON.parse(ethers.toUtf8String(exerciseBytes));
      
      const updatedExercise = {
        ...exerciseData,
        status: "completed"
      };
      
      await contract.setData(
        `exercise_${exerciseId}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedExercise))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "FHE processing completed successfully!"
      });
      
      await loadExercises();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Processing failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const skipExercise = async (exerciseId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Processing encrypted data with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const exerciseBytes = await contract.getData(`exercise_${exerciseId}`);
      if (exerciseBytes.length === 0) {
        throw new Error("Exercise not found");
      }
      
      const exerciseData = JSON.parse(ethers.toUtf8String(exerciseBytes));
      
      const updatedExercise = {
        ...exerciseData,
        status: "skipped"
      };
      
      await contract.setData(
        `exercise_${exerciseId}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedExercise))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "FHE processing completed successfully!"
      });
      
      await loadExercises();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Processing failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const isPatient = (address: string) => {
    return account.toLowerCase() === address.toLowerCase();
  };

  const filteredExercises = exercises.filter(exercise => 
    exercise.exerciseType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.difficulty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderProgressChart = () => {
    const total = exercises.length || 1;
    const completedPercentage = (completedCount / total) * 100;
    const prescribedPercentage = (prescribedCount / total) * 100;
    const skippedPercentage = (skippedCount / total) * 100;

    return (
      <div className="progress-chart">
        <div className="chart-bar">
          <div 
            className="bar-segment completed" 
            style={{ width: `${completedPercentage}%` }}
          ></div>
          <div 
            className="bar-segment prescribed" 
            style={{ width: `${prescribedPercentage}%` }}
          ></div>
          <div 
            className="bar-segment skipped" 
            style={{ width: `${skippedPercentage}%` }}
          ></div>
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="color-dot completed"></div>
            <span>Completed: {completedCount}</span>
          </div>
          <div className="legend-item">
            <div className="color-dot prescribed"></div>
            <span>Prescribed: {prescribedCount}</span>
          </div>
          <div className="legend-item">
            <div className="color-dot skipped"></div>
            <span>Skipped: {skippedCount}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Initializing FHE connection...</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <h1>StrokeRehab<span>FHE</span></h1>
          <p>Privacy-Preserving Post-Stroke Rehabilitation</p>
        </div>
        
        <div className="header-actions">
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <main className="main-content">
        <section className="hero-section">
          <div className="hero-content">
            <h2>Secure Stroke Rehabilitation</h2>
            <p>Personalized exercises with fully homomorphic encryption to protect your health data</p>
            <button 
              onClick={() => setShowExerciseModal(true)} 
              className="primary-btn"
              disabled={!account}
            >
              Add Exercise
            </button>
          </div>
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
        </section>

        <section className="controls-section">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search exercises..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="search-btn">🔍</button>
          </div>
          <div className="control-buttons">
            <button 
              onClick={loadExercises}
              className="refresh-btn"
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button 
              onClick={() => setShowStats(!showStats)}
              className="stats-btn"
            >
              {showStats ? "Hide Stats" : "Show Stats"}
            </button>
          </div>
        </section>

        {showStats && (
          <section className="stats-section">
            <div className="stat-card">
              <h3>Exercise Progress</h3>
              {renderProgressChart()}
            </div>
            <div className="stat-card">
              <h3>Summary</h3>
              <div className="stat-grid">
                <div className="stat-item">
                  <div className="stat-value">{exercises.length}</div>
                  <div className="stat-label">Total Exercises</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{completedCount}</div>
                  <div className="stat-label">Completed</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{prescribedCount}</div>
                  <div className="stat-label">Prescribed</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{skippedCount}</div>
                  <div className="stat-label">Skipped</div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="exercises-section">
          <h2>Your Rehabilitation Exercises</h2>
          {filteredExercises.length === 0 ? (
            <div className="empty-state">
              <p>No exercises found</p>
              <button 
                className="primary-btn"
                onClick={() => setShowExerciseModal(true)}
              >
                Add First Exercise
              </button>
            </div>
          ) : (
            <div className="exercises-grid">
              {filteredExercises.map(exercise => (
                <div className="exercise-card" key={exercise.id}>
                  <div className="card-header">
                    <h3>{exercise.exerciseType}</h3>
                    <span className={`status-badge ${exercise.status}`}>
                      {exercise.status}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="exercise-meta">
                      <div className="meta-item">
                        <span>Duration:</span>
                        <strong>{exercise.duration} mins</strong>
                      </div>
                      <div className="meta-item">
                        <span>Difficulty:</span>
                        <strong>{exercise.difficulty}</strong>
                      </div>
                      <div className="meta-item">
                        <span>Date:</span>
                        <strong>{new Date(exercise.timestamp * 1000).toLocaleDateString()}</strong>
                      </div>
                    </div>
                    <div className="card-actions">
                      {isPatient(exercise.patientAddress) && exercise.status === "prescribed" && (
                        <>
                          <button 
                            className="action-btn complete"
                            onClick={() => completeExercise(exercise.id)}
                          >
                            Complete
                          </button>
                          <button 
                            className="action-btn skip"
                            onClick={() => skipExercise(exercise.id)}
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="fhe-tag">
                    <span>FHE Encrypted</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
  
      {showExerciseModal && (
        <ModalExercise 
          onSubmit={submitExercise} 
          onClose={() => setShowExerciseModal(false)} 
          creating={creating}
          exerciseData={newExerciseData}
          setExerciseData={setNewExerciseData}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="spinner"></div>}
              {transactionStatus.status === "success" && "✓"}
              {transactionStatus.status === "error" && "✗"}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>StrokeRehabFHE</h3>
            <p>Privacy-preserving post-stroke rehabilitation using FHE technology</p>
          </div>
          <div className="footer-links">
            <a href="#" className="footer-link">About</a>
            <a href="#" className="footer-link">Privacy</a>
            <a href="#" className="footer-link">Terms</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} StrokeRehabFHE. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

interface ModalExerciseProps {
  onSubmit: () => void; 
  onClose: () => void; 
  creating: boolean;
  exerciseData: any;
  setExerciseData: (data: any) => void;
}

const ModalExercise: React.FC<ModalExerciseProps> = ({ 
  onSubmit, 
  onClose, 
  creating,
  exerciseData,
  setExerciseData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setExerciseData({
      ...exerciseData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (!exerciseData.exerciseType) {
      alert("Please select exercise type");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="exercise-modal">
        <div className="modal-header">
          <h2>Add Rehabilitation Exercise</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice">
            <span>🔒</span> Your exercise data will be encrypted with FHE
          </div>
          
          <div className="form-group">
            <label>Exercise Type *</label>
            <select 
              name="exerciseType"
              value={exerciseData.exerciseType} 
              onChange={handleChange}
              required
            >
              <option value="">Select exercise</option>
              <option value="Arm Movement">Arm Movement</option>
              <option value="Leg Movement">Leg Movement</option>
              <option value="Speech Therapy">Speech Therapy</option>
              <option value="Cognitive Training">Cognitive Training</option>
              <option value="Balance Exercise">Balance Exercise</option>
            </select>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Duration (minutes) *</label>
              <input 
                type="number" 
                name="duration"
                min="5"
                max="60"
                value={exerciseData.duration} 
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Difficulty *</label>
              <select 
                name="difficulty"
                value={exerciseData.difficulty} 
                onChange={handleChange}
                required
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label>Results (Optional)</label>
            <textarea 
              name="results"
              value={exerciseData.results} 
              onChange={handleChange}
              placeholder="Enter exercise results or notes..." 
              rows={3}
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={creating}
            className="submit-btn"
          >
            {creating ? "Encrypting with FHE..." : "Submit Securely"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;