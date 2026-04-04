// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title HumanProof
/// @notice Trusted marketplace where AI agents hire verified humans
/// @dev Workers are verified via World ID (1 human = 1 profile).
///      Clients can be verified humans or authenticated AI agents (AgentKit).
///      Payments are secured in escrow until task completion is validated.

interface IWorldID {
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}

library ByteHasher {
    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(value))) >> 8;
    }
}

contract HumanProof {
    using ByteHasher for bytes;

    // ─── Errors ────────────────────────────────────────────────────────────────
    error AlreadyRegistered();
    error NotVerifiedWorker();
    error TaskNotOpen();
    error TaskNotAssigned();
    error NotAssignedWorker();
    error NotTaskClient();
    error DeadlineNotReached();
    error AlreadyCompleted();
    error InvalidPayment();

    // ─── Events ────────────────────────────────────────────────────────────────
    event WorkerRegistered(address indexed worker, uint256 nullifierHash);
    event TaskCreated(uint256 indexed taskId, address indexed client, uint256 budget);
    event TaskClaimed(uint256 indexed taskId, address indexed worker);
    event TaskCompleted(uint256 indexed taskId, address indexed worker, string proofUri);
    event TaskValidated(uint256 indexed taskId, address indexed worker, uint256 payment);
    event TaskDisputed(uint256 indexed taskId);

    // ─── Enums ─────────────────────────────────────────────────────────────────
    enum TaskStatus { Open, Assigned, Completed, Validated, Disputed }
    enum ClientType { Human, AIAgent }

    // ─── Structs ───────────────────────────────────────────────────────────────
    struct Worker {
        address addr;
        uint256 nullifierHash;   // World ID nullifier — proves unique human
        bool verified;
        uint256 tasksCompleted;
        uint256 reputationScore; // 0-100
        string profileUri;       // IPFS or metadata URI
    }

    struct Task {
        uint256 id;
        address client;
        ClientType clientType;   // Human or AIAgent
        string title;
        string description;
        string category;         // "physical", "cognitive", "social"
        uint256 budget;          // in wei (USDC via MiniKit)
        uint256 deadline;        // unix timestamp
        address assignedWorker;
        TaskStatus status;
        string completionProofUri;
        uint256 createdAt;
    }

    // ─── State ─────────────────────────────────────────────────────────────────
    IWorldID public immutable worldId;
    uint256  public immutable groupId = 1; // Orb-verified
    uint256  public immutable appId;

    mapping(address => Worker) public workers;
    mapping(uint256 => bool)   public nullifierUsed; // prevents double registration

    mapping(uint256 => Task) public tasks;
    uint256 public taskCount;

    // ─── Constructor ───────────────────────────────────────────────────────────
    constructor(IWorldID _worldId, uint256 _appId) {
        worldId = _worldId;
        appId   = _appId;
    }

    // ─── Worker Registration ───────────────────────────────────────────────────

    /// @notice Register as a verified human worker
    /// @dev World ID ensures 1 unique human = 1 worker profile
    function registerWorker(
        string calldata profileUri,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        if (workers[msg.sender].verified) revert AlreadyRegistered();
        if (nullifierUsed[nullifierHash]) revert AlreadyRegistered();

        uint256 externalNullifier = abi.encodePacked(appId, "register-worker").hashToField();
        uint256 signalHash = abi.encodePacked(msg.sender).hashToField();

        worldId.verifyProof(root, groupId, signalHash, nullifierHash, externalNullifier, proof);

        nullifierUsed[nullifierHash] = true;
        workers[msg.sender] = Worker({
            addr: msg.sender,
            nullifierHash: nullifierHash,
            verified: true,
            tasksCompleted: 0,
            reputationScore: 50, // starts neutral
            profileUri: profileUri
        });

        emit WorkerRegistered(msg.sender, nullifierHash);
    }

    // ─── Task Management ───────────────────────────────────────────────────────

    /// @notice Post a task with payment in escrow
    /// @dev Client can be a human or an AI agent (identified via clientType)
    function createTask(
        string calldata title,
        string calldata description,
        string calldata category,
        uint256 deadline,
        ClientType clientType
    ) external payable returns (uint256 taskId) {
        require(msg.value > 0, "Budget required");
        require(deadline > block.timestamp, "Deadline must be in future");

        taskId = taskCount++;
        tasks[taskId] = Task({
            id: taskId,
            client: msg.sender,
            clientType: clientType,
            title: title,
            description: description,
            category: category,
            budget: msg.value,
            deadline: deadline,
            assignedWorker: address(0),
            status: TaskStatus.Open,
            completionProofUri: "",
            createdAt: block.timestamp
        });

        emit TaskCreated(taskId, msg.sender, msg.value);
    }

    /// @notice Claim an open task (workers only)
    function claimTask(uint256 taskId) external {
        if (!workers[msg.sender].verified) revert NotVerifiedWorker();
        Task storage t = tasks[taskId];
        if (t.status != TaskStatus.Open) revert TaskNotOpen();

        t.status = TaskStatus.Assigned;
        t.assignedWorker = msg.sender;

        emit TaskClaimed(taskId, msg.sender);
    }

    /// @notice Submit completion proof
    /// @param proofUri  IPFS URI or URL to proof (photo, video, document...)
    function submitCompletion(uint256 taskId, string calldata proofUri) external {
        Task storage t = tasks[taskId];
        if (t.status != TaskStatus.Assigned) revert TaskNotAssigned();
        if (t.assignedWorker != msg.sender) revert NotAssignedWorker();

        t.status = TaskStatus.Completed;
        t.completionProofUri = proofUri;

        emit TaskCompleted(taskId, msg.sender, proofUri);
    }

    /// @notice Client validates completion — releases escrow to worker
    function validateTask(uint256 taskId) external {
        Task storage t = tasks[taskId];
        if (t.client != msg.sender) revert NotTaskClient();
        if (t.status != TaskStatus.Completed) revert AlreadyCompleted();

        t.status = TaskStatus.Validated;

        // Update worker reputation
        Worker storage w = workers[t.assignedWorker];
        w.tasksCompleted++;
        if (w.reputationScore < 95) w.reputationScore += 5;

        // Release escrow to worker
        (bool sent, ) = t.assignedWorker.call{value: t.budget}("");
        require(sent, "Payment failed");

        emit TaskValidated(taskId, t.assignedWorker, t.budget);
    }

    /// @notice Open a dispute if task not completed before deadline
    function disputeTask(uint256 taskId) external {
        Task storage t = tasks[taskId];
        if (t.client != msg.sender) revert NotTaskClient();
        if (block.timestamp <= t.deadline) revert DeadlineNotReached();
        if (t.status == TaskStatus.Validated) revert AlreadyCompleted();

        t.status = TaskStatus.Disputed;

        // For hackathon: auto-refund client on dispute
        // Production: would involve arbitration
        (bool sent, ) = t.client.call{value: t.budget}("");
        require(sent, "Refund failed");

        // Penalize worker reputation if assigned
        if (t.assignedWorker != address(0)) {
            Worker storage w = workers[t.assignedWorker];
            if (w.reputationScore > 15) w.reputationScore -= 15;
        }

        emit TaskDisputed(taskId);
    }

    // ─── Views ─────────────────────────────────────────────────────────────────

    function getWorker(address addr) external view returns (Worker memory) {
        return workers[addr];
    }

    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }

    function isVerifiedWorker(address addr) external view returns (bool) {
        return workers[addr].verified;
    }
}
