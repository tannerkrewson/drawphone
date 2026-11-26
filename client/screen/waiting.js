import Screen from "./screen.js";
import UserList from "../userlist.js";

/* global $ */

class Waiting extends Screen {
    constructor() {
        super();

        this.id = "#waiting";
        this.setTitle("Waiting for other players...");
        this.userList = new UserList($("#waiting-players"));
        this.vacantList = new UserList($("#waiting-vacant-players"));
        this.replaceDialog = $("#replace-seat").get(0);
        this.replacement = $("#replace-seat-player");
        this.replaceButton = $("#replace-seat button[value='replace']");
        this.replacement.on("change", () =>
            this.replaceButton.prop("disabled", !this.replacement.val()),
        );
        $("#replace-seat button[value='cancel']").on("click", () => this.replaceDialog.close());
        this.replaceButton.on("click", () => {
            const playerId = this.replacement.val();
            this.replaceDialog.close();
            if (playerId) this.onReplace?.(this.selectedSeat, playerId);
        });
    }

    updateWaitingList({
        players,
        vacant,
        unseated,
        leaderId,
        onSkip,
        onReplace,
        nextRound,
        count,
        finalCount,
    }) {
        this.setSubtitle(`${count}/${finalCount}`);
        $("#waiting-next-round").toggleClass("d-none", !nextRound);
        $("#waiting-active").toggleClass("d-none", !players.length);
        $("#waiting-vacant").toggleClass("d-none", !vacant.length);
        this.userList.update(players, leaderId);
        this.onReplace = onReplace;
        const canReplace = onReplace && unseated.length > 0;
        this.vacantList.update(vacant, leaderId, {
            onSkip,
            onReplace: canReplace
                ? ({ seat, name }) => {
                      this.selectedSeat = seat;
                      this.replacement.val("").trigger("change");
                      $("#replace-seat-title").text(`Replace ${name}`);
                      this.replaceDialog.showModal();
                  }
                : undefined,
        });

        if (
            this.replaceDialog.open &&
            (!canReplace || !vacant.some(({ seat }) => seat === this.selectedSeat))
        ) {
            this.replaceDialog.close();
        }
        const selectedPlayer = this.replacement.val();
        this.replacement.empty().append($("<option disabled value=''>").text("Select a player..."));
        for (const player of unseated) {
            $("<option>").val(player.id).text(player.name).appendTo(this.replacement);
        }
        this.replacement
            .val(unseated.some(({ id }) => id === selectedPlayer) ? selectedPlayer : "")
            .trigger("change");
    }

    closeReplacement() {
        if (this.replaceDialog.open) this.replaceDialog.close();
    }
}

export default Waiting;
