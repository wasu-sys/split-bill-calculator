#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Bill {
    pub owner: Address,
    pub total: i128,
    pub paid_total: i128,
    pub participant_count: u32,
    pub settled: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Participant {
    pub share: i128,
    pub paid: i128,
}

#[contracttype]
#[derive(Clone)]
enum DataKey { Bill(u64), Participant(u64, Address) }

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SplitBillError {
    BillAlreadyExists = 1, BillNotFound = 2, ParticipantAlreadyExists = 3,
    ParticipantNotFound = 4, InvalidAmount = 5, BillAlreadySettled = 6,
    PaymentExceedsShare = 7, BillNotFullyPaid = 8,
}

#[contract]
pub struct SplitBillContract;

#[contractimpl]
impl SplitBillContract {
    pub fn create_bill(env: Env, bill_id: u64, owner: Address, total: i128) -> Result<Bill, SplitBillError> {
        owner.require_auth();
        if total <= 0 { return Err(SplitBillError::InvalidAmount); }
        let key = DataKey::Bill(bill_id);
        if env.storage().persistent().has(&key) { return Err(SplitBillError::BillAlreadyExists); }
        let bill = Bill { owner, total, paid_total: 0, participant_count: 0, settled: false };
        env.storage().persistent().set(&key, &bill);
        Ok(bill)
    }

    pub fn add_participant(env: Env, bill_id: u64, participant: Address, share: i128) -> Result<(), SplitBillError> {
        if share <= 0 { return Err(SplitBillError::InvalidAmount); }
        let mut bill = Self::load_bill(&env, bill_id)?;
        bill.owner.require_auth();
        if bill.settled { return Err(SplitBillError::BillAlreadySettled); }
        let participant_key = DataKey::Participant(bill_id, participant);
        if env.storage().persistent().has(&participant_key) { return Err(SplitBillError::ParticipantAlreadyExists); }
        env.storage().persistent().set(&participant_key, &Participant { share, paid: 0 });
        bill.participant_count += 1;
        env.storage().persistent().set(&DataKey::Bill(bill_id), &bill);
        Ok(())
    }

    pub fn pay_share(env: Env, bill_id: u64, participant: Address, amount: i128) -> Result<Participant, SplitBillError> {
        participant.require_auth();
        if amount <= 0 { return Err(SplitBillError::InvalidAmount); }
        let mut bill = Self::load_bill(&env, bill_id)?;
        if bill.settled { return Err(SplitBillError::BillAlreadySettled); }
        let participant_key = DataKey::Participant(bill_id, participant);
        let mut payment = env.storage().persistent().get::<DataKey, Participant>(&participant_key).ok_or(SplitBillError::ParticipantNotFound)?;
        if payment.paid + amount > payment.share { return Err(SplitBillError::PaymentExceedsShare); }
        payment.paid += amount;
        bill.paid_total += amount;
        env.storage().persistent().set(&participant_key, &payment);
        env.storage().persistent().set(&DataKey::Bill(bill_id), &bill);
        Ok(payment)
    }

    pub fn settle_bill(env: Env, bill_id: u64) -> Result<Bill, SplitBillError> {
        let mut bill = Self::load_bill(&env, bill_id)?;
        bill.owner.require_auth();
        if bill.settled { return Err(SplitBillError::BillAlreadySettled); }
        if bill.paid_total < bill.total { return Err(SplitBillError::BillNotFullyPaid); }
        bill.settled = true;
        env.storage().persistent().set(&DataKey::Bill(bill_id), &bill);
        Ok(bill)
    }

    pub fn get_bill(env: Env, bill_id: u64) -> Result<Bill, SplitBillError> { Self::load_bill(&env, bill_id) }

    pub fn get_participant(env: Env, bill_id: u64, participant: Address) -> Result<Participant, SplitBillError> {
        env.storage().persistent().get::<DataKey, Participant>(&DataKey::Participant(bill_id, participant)).ok_or(SplitBillError::ParticipantNotFound)
    }

    fn load_bill(env: &Env, bill_id: u64) -> Result<Bill, SplitBillError> {
        env.storage().persistent().get::<DataKey, Bill>(&DataKey::Bill(bill_id)).ok_or(SplitBillError::BillNotFound)
    }
}

#[cfg(test)]
mod test {
    extern crate std;
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(SplitBillContract, ());
        let owner = Address::generate(&env);
        let participant = Address::generate(&env);
        (env, contract_id, owner, participant)
    }

    #[test]
    fn creates_a_bill_and_adds_a_participant() {
        let (env, contract_id, owner, participant) = setup();
        let client = SplitBillContractClient::new(&env, &contract_id);
        let bill = client.create_bill(&1, &owner, &1_000);
        assert_eq!(bill.total, 1_000);
        client.add_participant(&1, &participant, &1_000);
        assert_eq!(client.get_bill(&1).participant_count, 1);
    }

    #[test]
    fn records_payments_and_settles_a_bill() {
        let (env, contract_id, owner, participant) = setup();
        let client = SplitBillContractClient::new(&env, &contract_id);
        client.create_bill(&2, &owner, &500);
        client.add_participant(&2, &participant, &500);
        assert_eq!(client.pay_share(&2, &participant, &500).paid, 500);
        assert!(client.settle_bill(&2).settled);
    }

    #[test]
    fn refuses_to_settle_before_all_shares_are_paid() {
        let (env, contract_id, owner, participant) = setup();
        let client = SplitBillContractClient::new(&env, &contract_id);
        client.create_bill(&3, &owner, &600);
        client.add_participant(&3, &participant, &600);
        client.pay_share(&3, &participant, &300);
        assert_eq!(client.try_settle_bill(&3), Err(Ok(SplitBillError::BillNotFullyPaid)));
    }
}
