# Assumptions

Emulator-only assumptions:
- synthetic point IDs use 0_1_<circuit>;
- U1/I1/P1/EP1 are used as the primary synthetic channel;
- QoS 1 and retain=false are the lab profile.

Non-assumptions:
- one serial does not automatically equal one physical BFDB;
- 0_1_13 is not assumed to be physical Circuit 13;
- the complete 96-circuit field mapping is not yet known;
- FC04/high-word-first still requires Metasys confirmation.
