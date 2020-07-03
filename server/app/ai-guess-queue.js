class AIGuessQueue {
	constructor() {
		this.reset();
	}

	addWork(workToAdd) {
		this.workQueue.push(workToAdd);

		this.distributeWork();
	}

	playerAvailableForWork(player) {
		if (player.isAi) return;

		const playerAlreadyInQueue = this.workerQueue.indexOf(player);
		if (playerAlreadyInQueue) this.workerQueue.push(player);

		this.distributeWork();
	}

	distributeWork() {
		while (this.workLeft() && this.workersLeft()) {
			this.giveNextWorkerNextWork();
		}
	}

	giveNextWorkerNextWork() {
		const nextPlayer = this.workerQueue.shift();
		const { drawingToGuess, next } = this.workQueue.shift();

		nextPlayer.sendThen(
			"makeAIGuess",
			drawingToGuess,
			"AIGuessResult",
			res => {
				next(res);

				this.playerAvailableForWork(nextPlayer);
			}
		);

		// TODO handle work never comes back
	}

	reset() {
		this.workQueue = [];
		this.workerQueue = [];
	}

	workLeft = () => this.workQueue.length > 0;

	workersLeft = () => this.workerQueue.length > 0;
}

module.exports = AIGuessQueue;
