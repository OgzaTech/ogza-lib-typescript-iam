import { IDomainEvent, UniqueEntityID } from "@ogza/core";
import { User } from "../User";

export class UserLoggedInEvent implements IDomainEvent {
  public dateTimeOccurred: Date;
  public user: User;
  public ipAddress: string;
  public userAgent: string;
  public invalidateOtherSessions: boolean;

  constructor(user: User, ip: string, agent: string, invalidateOthers: boolean) {
    this.dateTimeOccurred = new Date();
    this.user = user;
    this.ipAddress = ip;
    this.userAgent = agent;
    this.invalidateOtherSessions = invalidateOthers;
  }

  getAggregateId(): UniqueEntityID {
    return this.user.id;
  }
}