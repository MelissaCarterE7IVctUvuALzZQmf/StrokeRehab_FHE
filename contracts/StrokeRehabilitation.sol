// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract StrokeRehabilitation is SepoliaConfig {
    // Encrypted patient assessment
    struct EncryptedAssessment {
        euint32 motorFunction;   // Encrypted motor function score
        euint32 cognitiveAbility; // Encrypted cognitive ability score
        euint32 painLevel;        // Encrypted pain level
        uint256 timestamp;
    }
    
    // Personalized training plan
    struct TrainingPlan {
        euint32[] exerciseIntensity; // Encrypted exercise intensity levels
        euint32[] cognitiveTasks;    // Encrypted cognitive task levels
        uint256 assessmentId;
        bool isGenerated;
    }
    
    // Patient progress tracking
    struct ProgressRecord {
        euint32 motorImprovement; // Encrypted improvement score
        euint32 cognitiveGain;    // Encrypted cognitive gain
        uint256 timestamp;
    }
    
    // Contract state
    mapping(address => EncryptedAssessment) public patientAssessments;
    mapping(address => TrainingPlan) public trainingPlans;
    mapping(address => ProgressRecord[]) public progressRecords;
    
    // Decryption tracking
    mapping(uint256 => address) private requestToPatient;
    
    // Events
    event AssessmentSubmitted(address indexed patient);
    event TrainingPlanRequested(address indexed patient);
    event TrainingPlanGenerated(address indexed patient);
    event ProgressRecorded(address indexed patient);
    event PlanDecrypted(address indexed patient);

    /// @notice Submit encrypted patient assessment
    function submitAssessment(
        euint32 motorScore,
        euint32 cognitiveScore,
        euint32 painScore
    ) external {
        patientAssessments[msg.sender] = EncryptedAssessment({
            motorFunction: motorScore,
            cognitiveAbility: cognitiveScore,
            painLevel: painScore,
            timestamp: block.timestamp
        });
        
        emit AssessmentSubmitted(msg.sender);
    }

    /// @notice Request personalized training plan
    function requestTrainingPlan() external {
        require(FHE.isInitialized(patientAssessments[msg.sender].motorFunction), "No assessment");
        
        // Prepare encrypted data for processing
        EncryptedAssessment storage assessment = patientAssessments[msg.sender];
        bytes32[] memory ciphertexts = new bytes32[](3);
        ciphertexts[0] = FHE.toBytes32(assessment.motorFunction);
        ciphertexts[1] = FHE.toBytes32(assessment.cognitiveAbility);
        ciphertexts[2] = FHE.toBytes32(assessment.painLevel);
        
        // Request AI processing
        uint256 reqId = FHE.requestDecryption(ciphertexts, this.handleTrainingPlan.selector);
        requestToPatient[reqId] = msg.sender;
        
        emit TrainingPlanRequested(msg.sender);
    }

    /// @notice Handle generated training plan
    function handleTrainingPlan(
        uint256 requestId,
        bytes memory cleartext,
        bytes memory proof
    ) external {
        address patient = requestToPatient[requestId];
        require(patient != address(0), "Invalid request");
        
        // Verify decryption proof
        FHE.checkSignatures(requestId, cleartext, proof);
        
        // Process AI-generated training plan
        euint32[] memory planData = abi.decode(cleartext, (euint32[]));
        
        // Split into exercise and cognitive components
        euint32[] memory exercisePlan = new euint32[](7); // Weekly plan
        euint32[] memory cognitivePlan = new euint32[](7);
        
        for (uint i = 0; i < 7; i++) {
            exercisePlan[i] = planData[i];
            cognitivePlan[i] = planData[i+7];
        }
        
        // Store encrypted training plan
        trainingPlans[patient] = TrainingPlan({
            exerciseIntensity: exercisePlan,
            cognitiveTasks: cognitivePlan,
            assessmentId: requestId,
            isGenerated: true
        });
        
        emit TrainingPlanGenerated(patient);
    }

    /// @notice Submit progress update
    function submitProgress(
        euint32 motorImprovement,
        euint32 cognitiveGain
    ) external {
        require(trainingPlans[msg.sender].isGenerated, "No training plan");
        
        progressRecords[msg.sender].push(ProgressRecord({
            motorImprovement: motorImprovement,
            cognitiveGain: cognitiveGain,
            timestamp: block.timestamp
        }));
        
        emit ProgressRecorded(msg.sender);
    }

    /// @notice Request decryption of training plan
    function requestPlanDecryption() external {
        TrainingPlan storage plan = trainingPlans[msg.sender];
        require(plan.isGenerated, "No training plan");
        
        // Prepare encrypted plan for decryption
        uint256 totalItems = plan.exerciseIntensity.length + plan.cognitiveTasks.length;
        bytes32[] memory ciphertexts = new bytes32[](totalItems);
        
        for (uint i = 0; i < plan.exerciseIntensity.length; i++) {
            ciphertexts[i] = FHE.toBytes32(plan.exerciseIntensity[i]);
        }
        
        for (uint i = 0; i < plan.cognitiveTasks.length; i++) {
            ciphertexts[i + plan.exerciseIntensity.length] = FHE.toBytes32(plan.cognitiveTasks[i]);
        }
        
        // Request decryption
        uint256 reqId = FHE.requestDecryption(ciphertexts, this.handleDecryptedPlan.selector);
        requestToPatient[reqId] = msg.sender;
    }

    /// @notice Handle decrypted training plan
    function handleDecryptedPlan(
        uint256 requestId,
        bytes memory cleartext,
        bytes memory proof
    ) external {
        address patient = requestToPatient[requestId];
        require(patient != address(0), "Invalid request");
        
        // Verify decryption proof
        FHE.checkSignatures(requestId, cleartext, proof);
        
        // Process decrypted plan
        uint32[] memory planData = abi.decode(cleartext, (uint32[]));
        
        // In real implementation, send plan to patient interface
        emit PlanDecrypted(patient);
    }

    /// @notice Get progress record count
    function getProgressCount(address patient) external view returns (uint256) {
        return progressRecords[patient].length;
    }
}